import { createClient } from '@supabase/supabase-js'
import { initializeQdrantCollection, storeBatchEmbeddings } from './qdrant-store'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface MigrationOptions {
  contentType?: string
  language?: string
  batchSize?: number
  dryRun?: boolean
}

export interface MigrationStats {
  totalMigrated: number
  totalSkipped: number
  totalErrors: number
  processingTime: number
}

/**
 * Migrate embeddings from Supabase pgvector to Qdrant with binary quantization
 */
export async function migrateEmbeddingsToQdrant(
  options: MigrationOptions = {}
): Promise<MigrationStats> {
  const {
    contentType,
    language,
    batchSize = 50,
    dryRun = false,
  } = options

  const startTime = Date.now()
  const stats: MigrationStats = {
    totalMigrated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    processingTime: 0,
  }

  try {
    console.log('Starting migration from Supabase to Qdrant...')
    console.log(`Options: ${JSON.stringify(options, null, 2)}`)

    // Initialize Qdrant collection
    if (!dryRun) {
      await initializeQdrantCollection()
      console.log('Qdrant collection initialized')
    } else {
      console.log('DRY RUN: Skipping Qdrant collection initialization')
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

    console.log(`Found ${embeddings.length} embeddings to migrate`)

    // Process embeddings in batches
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(embeddings.length / batchSize)

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} embeddings)`)

      try {
        // Convert embeddings to Qdrant format
        const qdrantEmbeddings = batch.map(embedding => ({
          contentId: embedding.content_id,
          contentType: embedding.content_type,
          language: embedding.language,
          content: embedding.content,
          embedding: embedding.embedding,
          metadata: embedding.metadata || {},
        }))

        // Store batch in Qdrant
        if (!dryRun) {
          await storeBatchEmbeddings(qdrantEmbeddings)
          console.log(`Batch ${batchNumber} migrated successfully`)
        } else {
          console.log(`DRY RUN: Would migrate batch ${batchNumber}`)
        }

        stats.totalMigrated += batch.length
      } catch (batchError) {
        console.error(`Error processing batch ${batchNumber}:`, batchError)
        stats.totalErrors += batch.length
      }

      // Small delay to avoid overwhelming Qdrant
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    stats.processingTime = Date.now() - startTime

    console.log('Migration completed!')
    console.log(`Migrated: ${stats.totalMigrated}`)
    console.log(`Errors: ${stats.totalErrors}`)
    console.log(`Processing time: ${stats.processingTime}ms`)

    return stats
  } catch (error) {
    console.error('Migration failed:', error)
    stats.processingTime = Date.now() - startTime
    throw error
  }
}

/**
 * Validate migration by comparing counts
 */
export async function validateMigration(
  options: MigrationOptions = {}
): Promise<{ supabaseCount: number; qdrantCount: number; match: boolean }> {
  const { contentType, language } = options

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

    // Get Qdrant count
    const { getContentStats } = await import('./qdrant-store')
    const qdrantStats = await getContentStats()
    const qdrantCount = qdrantStats.totalEmbeddings

    const match = supabaseCount === qdrantCount

    console.log(`Supabase count: ${supabaseCount}`)
    console.log(`Qdrant count: ${qdrantCount}`)
    console.log(`Match: ${match}`)

    return {
      supabaseCount: supabaseCount || 0,
      qdrantCount,
      match,
    }
  } catch (error) {
    console.error('Validation failed:', error)
    throw error
  }
}

/**
 * Rollback migration by deleting Qdrant collection
 */
export async function rollbackMigration(): Promise<void> {
  try {
    const { QdrantClient } = await import('@qdrant/js-client-rest')
    
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333'
    const qdrantApiKey = process.env.QDRANT_API_KEY

    const qdrantClient = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
    })

    console.log('Rolling back migration...')

    try {
      await qdrantClient.deleteCollection('content_embeddings')
      console.log('Qdrant collection deleted successfully')
    } catch (error) {
      console.log('Collection may not exist or was already deleted')
    }

    console.log('Rollback completed')
  } catch (error) {
    console.error('Rollback failed:', error)
    throw error
  }
}

// CLI interface for running migration
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]

  const options: MigrationOptions = {
    contentType: process.env.CONTENT_TYPE,
    language: process.env.LANGUAGE,
    batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    dryRun: process.env.DRY_RUN === 'true',
  }

  async function runCommand() {
    switch (command) {
      case 'migrate':
        await migrateEmbeddingsToQdrant(options)
        break
      case 'validate':
        await validateMigration(options)
        break
      case 'rollback':
        await rollbackMigration()
        break
      default:
        console.log('Usage: npm run migrate-to-qdrant [migrate|validate|rollback]')
        console.log('Environment variables:')
        console.log('  CONTENT_TYPE - Filter by content type')
        console.log('  LANGUAGE - Filter by language')
        console.log('  BATCH_SIZE - Batch size for migration (default: 50)')
        console.log('  DRY_RUN - Set to "true" for dry run')
    }
  }

  runCommand().catch(console.error)
}
