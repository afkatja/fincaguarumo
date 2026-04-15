import { createClient } from "@supabase/supabase-js"
import {
  generateEmbedding,
  generateBatchEmbeddings,
  EmbeddingResult,
} from "./embeddings-hybrid"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface VectorSearchResult {
  id: string
  contentId: string
  contentType: string
  language: string
  content: string
  metadata: Record<string, any>
  similarity: number
}

export interface HybridSearchResult extends VectorSearchResult {
  keywordScore: number
  combinedScore: number
}

export interface SearchOptions {
  contentType?: string
  language?: string
  threshold?: number
  maxResults?: number
  semanticWeight?: number
  keywordWeight?: number
}

/**
 * Perform semantic search using vector similarity
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {},
): Promise<VectorSearchResult[]> {
  const { contentType, language, threshold = 0.7, maxResults = 10 } = options

  try {
    // Generate embedding for the query
    const { embedding } = await generateEmbedding(query)

    // Call the semantic search function
    const { data, error } = await supabase.rpc("semantic_search", {
      query_embedding: embedding,
      content_type_filter: contentType || null,
      language_filter: language || null,
      match_threshold: threshold,
      max_results: maxResults,
    })

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      contentId: row.content_id,
      contentType: row.content_type,
      language: row.language,
      content: row.content,
      metadata: row.metadata || {},
      similarity: row.similarity,
    }))
  } catch (error) {
    console.error("Error in semantic search:", error)
    throw new Error(
      `Semantic search error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Perform hybrid search combining semantic and keyword matching
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {},
): Promise<HybridSearchResult[]> {
  const {
    contentType,
    language,
    threshold = 0.5,
    maxResults = 10,
    semanticWeight = 0.7,
    keywordWeight = 0.3,
  } = options

  try {
    // Generate embedding for the query
    const { embedding, dimensions } = await generateEmbedding(query)

    // Diagnostic logging
    console.log("[hybridSearch] Query:", query)

    // Call the hybrid search function
    const { data, error } = await supabase.rpc("hybrid_search", {
      query_embedding: embedding,
      query_text: query,
      content_type_filter: contentType || null,
      language_filter: language || null,
      semantic_weight: semanticWeight,
      keyword_weight: keywordWeight,
      match_threshold: threshold,
      max_results: maxResults,
    })

    if (error) {
      console.error("[hybridSearch] Supabase RPC error:", error)
      throw new Error(`Hybrid search failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      contentId: row.content_id,
      contentType: row.content_type,
      language: row.language,
      content: row.content,
      metadata: row.metadata || {},
      similarity: row.similarity,
      keywordScore: row.keyword_score,
      combinedScore: row.combined_score,
    }))
  } catch (error) {
    console.error("Error in hybrid search:", error)
    throw new Error(
      `Hybrid search error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get similar content based on existing content ID
 */
export async function findSimilarContent(
  contentId: string,
  contentType: string,
  options: SearchOptions = {},
): Promise<VectorSearchResult[]> {
  const { language, threshold = 0.8, maxResults = 5 } = options

  try {
    // First get the embedding for the reference content
    const { data: referenceData, error: referenceError } = await supabase
      .from("content_embeddings")
      .select("embedding")
      .eq("content_id", contentId)
      .eq("content_type", contentType)
      .single()

    if (referenceError) {
      throw new Error(
        `Failed to get reference embedding: ${referenceError.message}`,
      )
    }

    if (!referenceData?.embedding) {
      throw new Error("No embedding found for reference content")
    }

    // Find similar content
    const { data, error } = await supabase.rpc("semantic_search", {
      query_embedding: referenceData.embedding,
      content_type_filter: contentType,
      language_filter: language || null,
      match_threshold: threshold,
      max_results: maxResults + 1, // +1 to exclude the reference itself
    })

    if (error) {
      throw new Error(`Similar content search failed: ${error.message}`)
    }

    // Filter out the reference content itself
    return (data || [])
      .filter((row: any) => row.content_id !== contentId)
      .slice(0, maxResults)
      .map((row: any) => ({
        id: row.id,
        contentId: row.content_id,
        contentType: row.content_type,
        language: row.language,
        content: row.content,
        metadata: row.metadata || {},
        similarity: row.similarity,
      }))
  } catch (error) {
    console.error("Error finding similar content:", error)
    throw new Error(
      `Similar content search error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get content by type and language
 */
export async function getContentByType(
  contentType: string,
  language: string,
  limit: number = 100,
): Promise<VectorSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from("content_embeddings")
      .select("*")
      .eq("content_type", contentType)
      .eq("language", language)
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get content by type: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      contentId: row.content_id,
      contentType: row.content_type,
      language: row.language,
      content: row.content,
      metadata: row.metadata || {},
      similarity: 1.0, // Perfect match for exact content retrieval
    }))
  } catch (error) {
    console.error("Error getting content by type:", error)
    throw new Error(
      `Content retrieval error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get content statistics
 */
export async function getContentStats(): Promise<{
  totalEmbeddings: number
  contentTypeStats: Record<string, number>
  languageStats: Record<string, number>
}> {
  try {
    const { data, error } = await supabase
      .from("content_embeddings")
      .select("content_type, language")

    if (error) {
      throw new Error(`Failed to get content stats: ${error.message}`)
    }

    const stats = data || []
    const contentTypeStats: Record<string, number> = {}
    const languageStats: Record<string, number> = {}

    stats.forEach((item: any) => {
      contentTypeStats[item.content_type] =
        (contentTypeStats[item.content_type] || 0) + 1
      languageStats[item.language] = (languageStats[item.language] || 0) + 1
    })

    return {
      totalEmbeddings: stats.length,
      contentTypeStats,
      languageStats,
    }
  } catch (error) {
    console.error("Error getting content stats:", error)
    throw new Error(
      `Stats retrieval error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Delete embeddings by content type and language
 */
export async function deleteEmbeddings(
  contentType: string,
  language?: string,
): Promise<number> {
  try {
    let query = supabase.from("content_embeddings").delete()

    if (language) {
      query = query.eq("language", language)
    }

    const { data, error } = await query.eq("content_type", contentType)

    if (error) {
      throw new Error(`Failed to delete embeddings: ${error.message}`)
    }

    return (data || []).length
  } catch (error) {
    console.error("Error deleting embeddings:", error)
    throw new Error(
      `Embedding deletion error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Rebuild embeddings for a specific content type
 */
export async function rebuildEmbeddings(
  contentType: string,
  language: string,
  contentProcessor: (items: any[]) => Promise<
    Array<{
      contentId: string
      content: string
      metadata: Record<string, any>
    }>
  >,
): Promise<void> {
  try {
    // Delete existing embeddings
    await deleteEmbeddings(contentType, language)

    // Get fresh content from the processor
    const contentItems = await contentProcessor([])

    if (contentItems.length === 0) {
      console.log(`No content items found for ${contentType} in ${language}`)
      return
    }

    // Generate embeddings in batches
    const batchSize = 50
    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize)
      const texts = batch.map(item => item.content)

      // Generate embeddings
      const { generateBatchEmbeddings } = await import("./embeddings-hybrid")
      const embeddings = await generateBatchEmbeddings(texts)

      // Store embeddings
      const { storeBatchEmbeddings } = await import("./embeddings")
      await storeBatchEmbeddings(
        batch.map((item, index) => ({
          contentId: item.contentId || `${contentType}_${language}_${index}`,
          contentType,
          language,
          content: item.content,
          embedding: embeddings[index].embedding,
          metadata: item.metadata,
        })),
      )

      console.log(
        `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contentItems.length / batchSize)} for ${contentType} in ${language}`,
      )
    }

    console.log(
      `Successfully rebuilt ${contentItems.length} embeddings for ${contentType} in ${language}`,
    )
  } catch (error) {
    console.error("Error rebuilding embeddings:", error)
    throw new Error(
      `Embedding rebuild error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}
