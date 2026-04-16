import { createClient } from '@supabase/supabase-js'
import { initializeQdrantCollection, storeBatchEmbeddings } from './qdrant-store'
import { getSemanticRAGConfig } from './config'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface CloudMigrationOptions {
  contentType?: string
  language?: string
  batchSize?: number
  dryRun?: boolean
  clearExisting?: boolean
}

export interface CloudMigrationStats {
  totalMigrated: number
  totalSkipped: number
  totalErrors: number
  processingTime: number
  cloudUrl: string
}

/**
 * Migrate embeddings from Supabase to Qdrant Cloud
 */
export async function migrateEmbeddingsToCloud(
  options: CloudMigrationOptions = {}
): Promise<CloudMigrationStats> {
  const {
    contentType,
    language,
    batchSize = 25, // Smaller batches for cloud
    dryRun = false,
    clearExisting = false,
  } = options

  const startTime = Date.now()
  const config = getSemanticRAGConfig()
  const stats: CloudMigrationStats = {
    totalMigrated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    processingTime: 0,
    cloudUrl: config.qdrantUrl || 'unknown',
  }

  try {
    console.log('Starting migration to Qdrant Cloud...')
    console.log(`Target cluster: ${config.qdrantUrl}`)
    console.log(`Options: ${JSON.stringify(options, null, 2)}`)

    if (!config.qdrantUrl || !config.qdrantApiKey) {
      throw new Error('Qdrant cloud configuration missing. Please check QDRANT_URL and QDRANT_API_KEY.')
    }

    // Initialize Qdrant Cloud collection
    if (!dryRun) {
      if (clearExisting) {
        console.log('Clearing existing collection...')
        const { QdrantClient } = await import('@qdrant/js-client-rest')
        const qdrantClient = new QdrantClient({
          url: config.qdrantUrl,
          apiKey: config.qdrantApiKey,
        })
        
        try {
          await qdrantClient.deleteCollection('content_embeddings')
          console.log('Existing collection cleared')
        } catch (error) {
          console.log('Collection may not exist, continuing...')
        }
      }
      
      await initializeQdrantCollection()
      console.log('Qdrant Cloud collection initialized')
    } else {
      console.log('DRY RUN: Skipping Qdrant Cloud collection initialization')
    }

    // Build query to fetch embeddings from Supabase
    let query = supabase
      .from('content_embeddings')
      .select('*')
      .order('created_at', { ascending: false })

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    if (language) {
      query = query.eq('language', language)
    }

    // Fetch all embeddings
    const { data: embeddings, error } = await query

    if (error) {
      throw new Error(`Failed to fetch embeddings from Supabase: ${error.message}`)
    }

    if (!embeddings || embeddings.length === 0) {
      console.log('No embeddings found to migrate')
      stats.processingTime = Date.now() - startTime
      return stats
    }

    console.log(`Found ${embeddings.length} embeddings to migrate to cloud`)

    // Process embeddings in smaller batches for cloud stability
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(embeddings.length / batchSize)

      console.log(`Processing cloud batch ${batchNumber}/${totalBatches} (${batch.length} embeddings)`)

      try {
        // Convert embeddings to Qdrant format
        const qdrantEmbeddings = batch.map(embedding => ({
          contentId: embedding.content_id,
          contentType: embedding.content_type,
          language: embedding.language as any,
          content: embedding.content,
          embedding: embedding.embedding,
          metadata: embedding.metadata || {},
        }))

        // Store batch in Qdrant Cloud
        if (!dryRun) {
          await storeBatchEmbeddings(qdrantEmbeddings)
          console.log(`Cloud batch ${batchNumber} migrated successfully`)
        } else {
          console.log(`DRY RUN: Would migrate cloud batch ${batchNumber}`)
        }

        stats.totalMigrated += batch.length
      } catch (batchError) {
        console.error(`Error processing cloud batch ${batchNumber}:`, batchError)
        stats.totalErrors += batch.length
      }

      // Longer delay for cloud stability
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    stats.processingTime = Date.now() - startTime

    console.log('Cloud migration completed!')
    console.log(`Migrated: ${stats.totalMigrated}`)
    console.log(`Errors: ${stats.totalErrors}`)
    console.log(`Processing time: ${stats.processingTime}ms`)
    console.log(`Cloud cluster: ${stats.cloudUrl}`)

    return stats
  } catch (error) {
    console.error('Cloud migration failed:', error)
    stats.processingTime = Date.now() - startTime
    throw error
  }
}

/**
 * Validate cloud migration
 */
export async function validateCloudMigration(
  options: CloudMigrationOptions = {}
): Promise<{ supabaseCount: number; qdrantCount: number; match: boolean; cloudUrl: string }> {
  const { contentType, language } = options
  const config = getSemanticRAGConfig()

  try {
    // Get Supabase count
    let supabaseQuery = supabase
      .from('content_embeddings')
      .select('id', { count: 'exact', head: true })

    if (contentType) {
      supabaseQuery = supabaseQuery.eq('content_type', contentType)
    }

    if (language) {
      supabaseQuery = supabaseQuery.eq('language', language)
    }

    const { count: supabaseCount, error: supabaseError } = await supabaseQuery

    if (supabaseError) {
      throw new Error(`Failed to get Supabase count: ${supabaseError.message}`)
    }

    // Get Qdrant Cloud count
    const { getContentStats } = await import('./vector-store-adapter')
    const qdrantStats = await getContentStats()
    const qdrantCount = qdrantStats.totalEmbeddings

    const match = supabaseCount === qdrantCount

    console.log(`Supabase count: ${supabaseCount}`)
    console.log(`Qdrant Cloud count: ${qdrantCount}`)
    console.log(`Match: ${match}`)
    console.log(`Cloud URL: ${config.qdrantUrl}`)

    return {
      supabaseCount: supabaseCount || 0,
      qdrantCount,
      match,
      cloudUrl: config.qdrantUrl || 'unknown',
    }
  } catch (error) {
    console.error('Cloud validation failed:', error)
    throw error
  }
}

// CLI interface for cloud migration
const args = process.argv.slice(2)
const command = args[0]

const options: CloudMigrationOptions = {
  contentType: process.env.CONTENT_TYPE,
  language: process.env.LANGUAGE,
  batchSize: parseInt(process.env.BATCH_SIZE || '25'),
  dryRun: process.env.DRY_RUN === 'true',
  clearExisting: process.env.CLEAR_EXISTING === 'true',
}

async function runCloudCommand() {
  switch (command) {
    case 'migrate':
      await migrateEmbeddingsToCloud(options)
      break
    case 'validate':
      await validateCloudMigration(options)
      break
    default:
      console.log('Usage: npm run migrate:to-cloud [migrate|validate]')
      console.log('Environment variables:')
      console.log('  CONTENT_TYPE - Filter by content type')
      console.log('  LANGUAGE - Filter by language')
      console.log('  BATCH_SIZE - Batch size for migration (default: 25)')
      console.log('  DRY_RUN - Set to "true" for dry run')
      console.log('  CLEAR_EXISTING - Set to "true" to clear existing data')
  }
}

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCloudCommand().catch(console.error)
}
