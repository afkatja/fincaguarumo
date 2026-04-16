import { QdrantClient } from "@qdrant/js-client-rest"
import {
  generateEmbedding,
  generateBatchEmbeddings,
  EmbeddingResult,
} from "./embeddings-hybrid"

// Initialize Qdrant client
const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333"
const qdrantApiKey = process.env.QDRANT_API_KEY

const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
})

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

export interface QdrantCollectionConfig {
  vectors: {
    size: number
    distance: "Cosine" | "Euclid" | "Dot"
  }
  optimizers_config: {
    default_segment_number: number
  }
  quantization_config?: {
    quantization_config: {
      type: "Binary"
      binary?: {
        binary: boolean
        threshold?: number
      }
    }
  }
}

const COLLECTION_NAME = "content_embeddings"
const VECTOR_SIZE = 768 // e5-base-instruct dimensions

/**
 * Initialize Qdrant collection with binary quantization
 */
export async function initializeQdrantCollection(): Promise<void> {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections()
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME)

    if (!exists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`)

      // Create collection with binary quantization
      const config: QdrantCollectionConfig = {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        quantization_config: {
          quantization_config: {
            type: "Binary",
            binary: {
              binary: true,
              threshold: 0.0,
            },
          },
        },
      }

      await qdrantClient.createCollection(COLLECTION_NAME, config)
      console.log(
        `Collection ${COLLECTION_NAME} created with binary quantization`,
      )
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`)
    }
  } catch (error) {
    console.error("Error initializing Qdrant collection:", error)
    throw new Error(
      `Failed to initialize Qdrant collection: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Store embedding in Qdrant with binary quantization
 */
export async function storeEmbedding(
  contentId: string,
  contentType: string,
  language: string,
  content: string,
  embedding: number[],
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    const point = {
      id: contentId,
      vector: embedding,
      payload: {
        content_id: contentId,
        content_type: contentType,
        language,
        content,
        metadata,
        updated_at: new Date().toISOString(),
      },
    }

    await qdrantClient.upsert(COLLECTION_NAME, {
      points: [point],
    })

    console.log(
      `Stored embedding for ${contentType}:${contentId} in ${language}`,
    )
  } catch (error) {
    console.error("Error storing embedding in Qdrant:", error)
    throw new Error(
      `Failed to store embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Store multiple embeddings in batch
 */
export async function storeBatchEmbeddings(
  embeddings: Array<{
    contentId: string
    contentType: string
    language: string
    content: string
    embedding: number[]
    metadata?: Record<string, any>
  }>,
): Promise<void> {
  try {
    const points = embeddings.map(emb => ({
      id: emb.contentId,
      vector: emb.embedding,
      payload: {
        content_id: emb.contentId,
        content_type: emb.contentType,
        language: emb.language,
        content: emb.content,
        metadata: emb.metadata || {},
        updated_at: new Date().toISOString(),
      },
    }))

    await qdrantClient.upsert(COLLECTION_NAME, {
      points,
    })

    console.log(`Stored batch of ${embeddings.length} embeddings in Qdrant`)
  } catch (error) {
    console.error("Error storing batch embeddings in Qdrant:", error)
    throw new Error(
      `Failed to store batch embeddings: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Perform semantic search using Qdrant with binary quantization
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {},
): Promise<VectorSearchResult[]> {
  const { contentType, language, threshold = 0.7, maxResults = 10 } = options

  try {
    // Generate embedding for the query
    const { embedding } = await generateEmbedding(query)

    // Build filter conditions
    const filter: any = {
      must: [],
    }

    if (contentType) {
      filter.must.push({
        key: "content_type",
        match: { value: contentType },
      })
    }

    if (language) {
      filter.must.push({
        key: "language",
        match: { value: language },
      })
    }

    // Search with binary quantization
    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: embedding,
      limit: maxResults,
      score_threshold: threshold,
      filter: filter.must.length > 0 ? filter : undefined,
    })

    return searchResult.map(point => ({
      id: point.id as string,
      contentId: point.payload?.content_id as string,
      contentType: point.payload?.content_type as string,
      language: point.payload?.language as string,
      content: point.payload?.content as string,
      metadata: point.payload?.metadata || {},
      similarity: point.score || 0,
    }))
  } catch (error) {
    console.error("Error in Qdrant semantic search:", error)
    throw new Error(
      `Semantic search error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Perform hybrid search combining Qdrant semantic and keyword matching
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
    // Get semantic results from Qdrant
    const semanticResults = await semanticSearch(query, {
      contentType,
      language,
      threshold: threshold * 0.8, // Lower threshold for semantic part
      maxResults: maxResults * 2, // Get more candidates
    })

    // Calculate keyword scores
    const resultsWithKeywordScore = semanticResults.map(result => {
      const keywordScore = calculateKeywordScore(query, result.content)
      const combinedScore =
        result.similarity * semanticWeight + keywordScore * keywordWeight

      return {
        ...result,
        keywordScore,
        combinedScore,
      }
    })

    // Filter and sort by combined score
    return resultsWithKeywordScore
      .filter(result => result.combinedScore >= threshold)
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, maxResults)
  } catch (error) {
    console.error("Error in hybrid search:", error)
    throw new Error(
      `Hybrid search error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Calculate keyword score for hybrid search
 */
function calculateKeywordScore(query: string, content: string): number {
  const queryLower = query.toLowerCase()
  const contentLower = content.toLowerCase()

  // Exact match gets highest score
  if (contentLower.includes(queryLower)) {
    return 1.0
  }

  // Partial matches get lower scores
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)
  const contentWords = contentLower.split(/\s+/)

  let matchCount = 0
  for (const queryWord of queryWords) {
    if (contentWords.some(contentWord => contentWord.includes(queryWord))) {
      matchCount++
    }
  }

  if (queryWords.length === 0) return 0.0
  return matchCount / queryWords.length
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
    const searchResult = await qdrantClient.retrieve(COLLECTION_NAME, {
      ids: [contentId],
      with_payload: true,
      with_vector: true,
    })

    if (searchResult.length === 0 || !searchResult[0].vector) {
      throw new Error("Reference content not found or has no embedding")
    }

    const referenceVector = searchResult[0].vector as number[]

    // Find similar content
    const similarResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: referenceVector,
      limit: maxResults + 1, // +1 to exclude the reference itself
      score_threshold: threshold,
      filter: {
        must: [
          { key: "content_type", match: { value: contentType } },
          ...(language
            ? [{ key: "language", match: { value: language } }]
            : []),
        ],
      },
    })

    // Filter out the reference content itself
    return similarResults
      .filter(point => point.id !== contentId)
      .slice(0, maxResults)
      .map(point => ({
        id: point.id as string,
        contentId: point.payload?.content_id as string,
        contentType: point.payload?.content_type as string,
        language: point.payload?.language as string,
        content: point.payload?.content as string,
        metadata: point.payload?.metadata || {},
        similarity: point.score || 0,
      }))
  } catch (error) {
    console.error("Error finding similar content:", error)
    throw new Error(
      `Similar content search error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get content statistics from Qdrant
 */
export async function getContentStats(): Promise<{
  totalEmbeddings: number
  contentTypeStats: Record<string, number>
  languageStats: Record<string, number>
}> {
  try {
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME)
    const totalEmbeddings = collectionInfo.points_count || 0

    // For detailed stats, we'd need to scroll through points
    // For now, return basic info
    return {
      totalEmbeddings,
      contentTypeStats: {},
      languageStats: {},
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
    const filter: any = {
      must: [
        { key: "content_type", match: { value: contentType } },
        ...(language ? [{ key: "language", match: { value: language } }] : []),
      ],
    }

    const deleteResult = await qdrantClient.delete(COLLECTION_NAME, {
      filter,
    })

    return deleteResult.status === "completed" ? 1 : 0 // Simplified for now
  } catch (error) {
    console.error("Error deleting embeddings:", error)
    throw new Error(
      `Embedding deletion error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Check if embedding exists for content
 */
export async function embeddingExists(
  contentId: string,
  contentType: string,
): Promise<boolean> {
  try {
    const searchResult = await qdrantClient.retrieve(COLLECTION_NAME, {
      ids: [contentId],
      with_payload: false,
      with_vector: false,
    })

    return searchResult.length > 0
  } catch (error) {
    console.error("Error checking embedding existence:", error)
    return false
  }
}
