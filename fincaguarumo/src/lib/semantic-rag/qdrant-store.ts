import { QdrantClient } from "@qdrant/js-client-rest"
import {
  generateEmbedding,
  generateBatchEmbeddings,
  EmbeddingResult,
} from "./embeddings-hybrid"

// Initialize Qdrant client
const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333"
const qdrantApiKey = process.env.QDRANT_API_KEY

// Retry configuration
const MAX_RETRIES = 3
const BASE_DELAY = 1000 // 1 second
const MAX_DELAY = 10000 // 10 seconds

// Configure client differently for cloud vs local
const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  ...(qdrantApiKey && { apiKey: qdrantApiKey }),
})

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry on certain error types
      if (
        error instanceof Error &&
        (error.message.includes("401") || // Unauthorized
          error.message.includes("403") || // Forbidden
          error.message.includes("404") || // Not found
          error.message.includes("422") || // Unprocessable entity
          error.message.includes("validation") ||
          error.message.includes("invalid"))
      ) {
        console.error(
          `Operation ${operationName} failed with non-retryable error:`,
          error,
        )
        throw error
      }

      if (attempt === maxRetries) {
        console.error(
          `Operation ${operationName} failed after ${maxRetries} attempts:`,
          error,
        )
        throw lastError
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000,
        MAX_DELAY,
      )

      console.warn(
        `Operation ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`,
        error,
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Circuit breaker for Qdrant operations
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED"

  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN"
        console.log("Circuit breaker transitioning to HALF_OPEN")
      } else {
        throw new Error("Circuit breaker is OPEN")
      }
    }

    try {
      const result = await operation()

      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED"
        this.failures = 0
        console.log("Circuit breaker transitioning to CLOSED")
      }

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      if (this.failures >= this.threshold) {
        this.state = "OPEN"
        console.error(
          "Circuit breaker transitioning to OPEN due to too many failures",
        )
      }

      throw error
    }
  }
}

const qdrantCircuitBreaker = new CircuitBreaker()

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

const COLLECTION_NAME = "content_embeddings"
const VECTOR_SIZE = 768 // e5-base-instruct dimensions

// Helper function to handle errors consistently
function handleError(error: unknown, context: string): never {
  const errorMessage = error instanceof Error ? error.message : "Unknown error"
  console.error(`${context}:`, error)
  throw new Error(`${context}: ${errorMessage}`)
}

// Helper function to validate and parse embedding
function validateAndParseEmbedding(
  embedding: number[] | string,
  contentId: string,
): number[] {
  let parsedEmbedding: number[]

  if (typeof embedding === "string") {
    try {
      parsedEmbedding = JSON.parse(embedding)
    } catch (parseError) {
      handleError(parseError, `Failed to parse embedding for ${contentId}`)
    }
  } else {
    parsedEmbedding = embedding
  }

  if (
    !Array.isArray(parsedEmbedding) ||
    parsedEmbedding.length !== VECTOR_SIZE
  ) {
    throw new Error(
      `Invalid embedding dimensions for ${contentId}: expected ${VECTOR_SIZE}, got ${parsedEmbedding?.length}`,
    )
  }

  return parsedEmbedding
}

// Helper function to create point payload
function createPointPayload(
  contentId: string,
  contentType: string,
  language: string,
  content: string,
  metadata: Record<string, any> = {},
) {
  return {
    content_id: contentId,
    content_type: contentType,
    language,
    content,
    metadata,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Initialize Qdrant collection with binary quantization
 */
export async function initializeQdrantCollection(): Promise<void> {
  return await qdrantCircuitBreaker.execute(async () => {
    return await retryWithBackoff(async () => {
      console.log(`Initializing Qdrant collection: ${COLLECTION_NAME}`)
      console.log(
        `Qdrant URL: ${qdrantUrl}, API Key configured: ${!!qdrantApiKey}`,
      )

      // Check if collection exists
      const collections = await qdrantClient.getCollections()
      console.log(
        `Available collections: ${collections.collections.map(c => c.name).join(", ")}`,
      )

      const exists = collections.collections.some(
        c => c.name === COLLECTION_NAME,
      )

      if (!exists) {
        console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`)

        // Create collection with binary quantization
        await qdrantClient.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: "Cosine",
          },
          quantization_config: {
            binary: {
              always_ram: true,
            },
          },
        })
        console.log(
          `Collection ${COLLECTION_NAME} created with binary quantization`,
        )
      } else {
        console.log(`Collection ${COLLECTION_NAME} already exists`)

        // Get collection info to verify configuration
        const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME)
        console.log(`Collection config:`, {
          vectors: collectionInfo.config?.params?.vectors,
          quantization: collectionInfo.config?.quantization_config,
        })
      }
    }, "initQdrantCollection")
  })
}

/**
 * Store embedding in Qdrant with binary quantization
 */
export async function storeEmbedding(
  contentId: string,
  contentType: string,
  language: string,
  content: string,
  embedding: number[] | string,
  metadata: Record<string, any> = {},
): Promise<void> {
  return await qdrantCircuitBreaker.execute(async () => {
    return await retryWithBackoff(async () => {
      const parsedEmbedding = validateAndParseEmbedding(embedding, contentId)
      const pointId = crypto.randomUUID()

      const point = {
        id: pointId,
        vector: parsedEmbedding,
        payload: createPointPayload(
          contentId,
          contentType,
          language,
          content,
          metadata,
        ),
      }

      await qdrantClient.upsert(COLLECTION_NAME, {
        points: [point],
      })

      console.log(
        `Stored embedding for ${contentType}:${contentId} in ${language}`,
      )
    }, "storeEmbedding")
  })
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
  return await qdrantCircuitBreaker.execute(async () => {
    return await retryWithBackoff(async () => {
      const points = embeddings.map((embedding, index) => {
        // Parse string embedding to number array
        let parsedEmbedding: number[]

        if (typeof embedding.embedding === "string") {
          try {
            parsedEmbedding = JSON.parse(embedding.embedding)
          } catch (parseError) {
            console.error(
              `Failed to parse embedding for ${embedding.contentId}:`,
              parseError,
            )
            throw new Error(
              `Invalid embedding format for ${embedding.contentId}`,
            )
          }
        } else {
          parsedEmbedding = embedding.embedding
        }

        // Validate embedding format
        if (
          !Array.isArray(parsedEmbedding) ||
          parsedEmbedding.length !== VECTOR_SIZE
        ) {
          throw new Error(
            `Invalid embedding dimensions for ${embedding.contentId}: expected ${VECTOR_SIZE}, got ${parsedEmbedding?.length}`,
          )
        }

        return {
          id: crypto.randomUUID(), // Generate UUID for each point
          vector: parsedEmbedding, // Use parsed number array
          payload: {
            content_id: embedding.contentId, // Store original content_id in payload
            content_type: embedding.contentType,
            language: embedding.language,
            content: embedding.content,
            metadata: embedding.metadata || {},
            updated_at: new Date().toISOString(),
          },
        }
      })

      console.log(`Attempting to store ${points.length} points...`)
      await qdrantClient.upsert(COLLECTION_NAME, {
        points,
      })

      console.log(`Stored batch of ${embeddings.length} embeddings in Qdrant`)
    }, "storeBatchEmbeddings")
  })
}

/**
 * Perform semantic search using Qdrant with binary quantization
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {},
): Promise<VectorSearchResult[]> {
  const { contentType, language, threshold = 0.7, maxResults = 10 } = options

  return await qdrantCircuitBreaker.execute(async () => {
    return await retryWithBackoff(async () => {
      console.log(
        `Qdrant semantic search - Query: "${query}", Options:`,
        options,
      )
      console.log(
        `Qdrant URL: ${qdrantUrl}, API Key configured: ${!!qdrantApiKey}`,
      )

      // Generate embedding for the query
      const { embedding } = await generateEmbedding(query)
      console.log(`Generated embedding dimension: ${embedding.length}`)

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

      const searchParams = {
        vector: embedding,
        limit: maxResults,
        score_threshold: threshold,
        filter: filter.must.length > 0 ? filter : undefined,
        params: {
          quantization: {
            rescore: true,
            oversampling: 10,
          },
        },
      }

      // Search with binary quantization
      const searchResult = await qdrantClient.search(
        COLLECTION_NAME,
        searchParams,
      )
      console.log(`Qdrant search returned ${searchResult.length} results`)

      return searchResult.map(point => ({
        id: point.id as string,
        contentId: point.payload?.content_id as string,
        contentType: point.payload?.content_type as string,
        language: point.payload?.language as string,
        content: point.payload?.content as string,
        metadata: point.payload?.metadata || {},
        similarity: point.score || 0,
      }))
    }, "semanticSearch")
  })
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
    // First find the point by content_id and content_type using scroll
    const scrollResult = await qdrantClient.scroll(COLLECTION_NAME, {
      filter: {
        must: [
          { key: "content_id", match: { value: contentId } },
          { key: "content_type", match: { value: contentType } },
        ],
      },
      limit: 1,
      with_payload: true,
      with_vector: true,
    })

    if (scrollResult.points.length === 0 || !scrollResult.points[0].vector) {
      throw new Error("Reference content not found or has no embedding")
    }

    const referencePoint = scrollResult.points[0]
    const referenceVector = referencePoint.vector as number[]
    const referencePointId = referencePoint.id as string

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
      params: {
        quantization: {
          rescore: true,
          oversampling: 10,
        },
      },
    })

    // Filter out the reference content itself using the actual point ID
    return similarResults
      .filter(point => point.id !== referencePointId)
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
  return await qdrantCircuitBreaker.execute(async () => {
    return await retryWithBackoff(async () => {
      const filter: any = {
        must: [
          { key: "content_type", match: { value: contentType } },
          ...(language
            ? [{ key: "language", match: { value: language } }]
            : []),
        ],
      }

      // First, count the matching embeddings to return actual deleted count
      const countResult = await qdrantClient.count(COLLECTION_NAME, {
        filter,
      })

      const deletedCount = countResult.count || 0

      // Only proceed with deletion if there are embeddings to delete
      if (deletedCount > 0) {
        const deleteResult = await qdrantClient.delete(COLLECTION_NAME, {
          filter,
        })

        // Verify deletion was successful
        if (deleteResult.status !== "completed") {
          throw new Error(
            `Delete operation failed with status: ${deleteResult.status}`,
          )
        }
      }

      return deletedCount
    }, "deleteEmbeddings")
  })
}

/**
 * Check if embedding exists for content
 */
export async function embeddingExists(
  contentId: string,
  contentType: string,
): Promise<boolean> {
  try {
    // Search by content_id in payload since we use UUIDs as point IDs
    const result = await qdrantClient.scroll(COLLECTION_NAME, {
      filter: {
        must: [
          { key: "content_id", match: { value: contentId } },
          { key: "content_type", match: { value: contentType } },
        ],
      },
      limit: 1,
      with_payload: true,
    })

    return result.points.length > 0
  } catch (error) {
    console.error("Error checking embedding existence:", error)
    return false
  }
}
