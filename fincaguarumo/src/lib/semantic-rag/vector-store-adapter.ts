import { getSemanticRAGConfig, isQdrantConfigured } from "./config"
import * as pgvectorStore from "./vector-store"
import * as qdrantStore from "./qdrant-store"
import * as embeddingFunctions from "./embeddings"

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
 * Adapter that switches between pgvector and Qdrant based on configuration
 */
export class VectorStoreAdapter {
  private useQdrant: boolean

  constructor() {
    this.useQdrant = isQdrantConfigured()

    if (this.useQdrant) {
      console.log("Using Qdrant vector store with binary quantization")
    } else {
      console.log("Using pgvector vector store")
    }
  }

  /**
   * Perform semantic search using the configured vector store
   */
  async semanticSearch(
    query: string,
    options: SearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    if (this.useQdrant) {
      try {
        const results = await qdrantStore.semanticSearch(query, options)
        return results.map(r => ({ ...r, language: r.language as string }))
      } catch (error) {
        console.warn(
          "Qdrant semantic search failed, falling back to pgvector:",
          error,
        )
        return pgvectorStore.semanticSearch(query, options)
      }
    } else {
      return pgvectorStore.semanticSearch(query, options)
    }
  }

  /**
   * Perform hybrid search using the configured vector store
   */
  async hybridSearch(
    query: string,
    options: SearchOptions = {},
  ): Promise<HybridSearchResult[]> {
    if (this.useQdrant) {
      try {
        const results = await qdrantStore.hybridSearch(query, options)
        return results.map(r => ({ ...r, language: r.language as string }))
      } catch (error) {
        console.warn(
          "Qdrant hybrid search failed, falling back to pgvector:",
          error,
        )
        return pgvectorStore.hybridSearch(query, options)
      }
    } else {
      return pgvectorStore.hybridSearch(query, options)
    }
  }

  /**
   * Find similar content using the configured vector store
   */
  async findSimilarContent(
    contentId: string,
    contentType: string,
    options: SearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    if (this.useQdrant) {
      try {
        const results = await qdrantStore.findSimilarContent(
          contentId,
          contentType,
          options,
        )
        return results.map(r => ({ ...r, language: r.language as string }))
      } catch (error) {
        console.warn(
          "Qdrant findSimilarContent failed, falling back to pgvector:",
          error,
        )
        return pgvectorStore.findSimilarContent(contentId, contentType, options)
      }
    } else {
      return pgvectorStore.findSimilarContent(contentId, contentType, options)
    }
  }

  /**
   * Get content statistics from the configured vector store
   */
  async getContentStats(): Promise<{
    totalEmbeddings: number
    contentTypeStats: Record<string, number>
    languageStats: Record<string, number>
  }> {
    if (this.useQdrant) {
      try {
        return qdrantStore.getContentStats()
      } catch (error) {
        console.warn(
          "Qdrant getContentStats failed, falling back to pgvector:",
          error,
        )
        return pgvectorStore.getContentStats()
      }
    } else {
      return pgvectorStore.getContentStats()
    }
  }

  /**
   * Store embedding in the configured vector store
   */
  async storeEmbedding(
    contentId: string,
    contentType: string,
    language: string,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {},
  ): Promise<void> {
    if (this.useQdrant) {
      try {
        return qdrantStore.storeEmbedding(
          contentId,
          contentType,
          language,
          content,
          embedding,
          metadata,
        )
      } catch (error) {
        console.warn(
          "Qdrant storeEmbedding failed, falling back to pgvector:",
          error,
        )
        return embeddingFunctions.storeEmbedding(
          contentId,
          contentType,
          language as any, // Cast to satisfy type constraint
          content,
          embedding,
          metadata,
        )
      }
    } else {
      return embeddingFunctions.storeEmbedding(
        contentId,
        contentType,
        language as any, // Cast to satisfy type constraint
        content,
        embedding,
        metadata,
      )
    }
  }

  /**
   * Store multiple embeddings in batch using the configured vector store
   */
  async storeBatchEmbeddings(
    embeddings: Array<{
      contentId: string
      contentType: string
      language: string
      content: string
      embedding: number[]
      metadata?: Record<string, any>
    }>,
  ): Promise<void> {
    if (this.useQdrant) {
      try {
        return qdrantStore.storeBatchEmbeddings(embeddings)
      } catch (error) {
        console.warn(
          "Qdrant storeBatchEmbeddings failed, falling back to pgvector:",
          error,
        )
        // Cast language to satisfy type constraint
        const castEmbeddings = embeddings.map(e => ({
          ...e,
          language: e.language as any,
        }))
        return embeddingFunctions.storeBatchEmbeddings(castEmbeddings)
      }
    } else {
      // Cast language to satisfy type constraint
      const castEmbeddings = embeddings.map(e => ({
        ...e,
        language: e.language as any,
      }))
      return embeddingFunctions.storeBatchEmbeddings(castEmbeddings)
    }
  }

  /**
   * Delete embeddings using the configured vector store
   */
  async deleteEmbeddings(
    contentType: string,
    language?: string,
  ): Promise<number> {
    if (this.useQdrant) {
      try {
        return qdrantStore.deleteEmbeddings(contentType, language)
      } catch (error) {
        console.warn(
          "Qdrant deleteEmbeddings failed, falling back to pgvector:",
          error,
        )
        return pgvectorStore.deleteEmbeddings(contentType, language)
      }
    } else {
      return pgvectorStore.deleteEmbeddings(contentType, language)
    }
  }

  /**
   * Check if embedding exists using the configured vector store
   */
  async embeddingExists(
    contentId: string,
    contentType: string,
  ): Promise<boolean> {
    if (this.useQdrant) {
      try {
        return qdrantStore.embeddingExists(contentId, contentType)
      } catch (error) {
        console.warn(
          "Qdrant embeddingExists failed, falling back to pgvector:",
          error,
        )
        return embeddingFunctions.embeddingExists(contentId, contentType)
      }
    } else {
      return embeddingFunctions.embeddingExists(contentId, contentType)
    }
  }

  /**
   * Initialize the vector store if needed
   */
  async initialize(): Promise<void> {
    if (this.useQdrant) {
      try {
        const { initializeQdrantCollection } = await import("./qdrant-store")
        return initializeQdrantCollection()
      } catch (error) {
        console.warn(
          "Qdrant initialization failed, falling back to pgvector:",
          error,
        )
        console.log("pgvector store is ready (initialized via migrations)")
      }
    } else {
      // pgvector is initialized via database migrations
      console.log("pgvector store is ready (initialized via migrations)")
    }
  }

  /**
   * Get the current vector store type
   */
  getVectorStoreType(): "pgvector" | "qdrant" {
    return this.useQdrant ? "qdrant" : "pgvector"
  }

  /**
   * Get performance characteristics of the current vector store
   */
  getPerformanceInfo(): {
    vectorStore: "pgvector" | "qdrant"
    binaryQuantization: boolean
    expectedSpeedup?: string
    memoryReduction?: string
  } {
    const config = getSemanticRAGConfig()

    return {
      vectorStore: config.vectorStore,
      binaryQuantization: config.enableBinaryQuantization,
      ...(config.vectorStore === "qdrant" &&
        config.enableBinaryQuantization && {
          expectedSpeedup: "40x faster search",
          memoryReduction: "32x less memory usage",
        }),
    }
  }
}

// Create singleton instance
export const vectorStoreAdapter = new VectorStoreAdapter()

// Export individual functions for backward compatibility
export const semanticSearch = (query: string, options?: SearchOptions) =>
  vectorStoreAdapter.semanticSearch(query, options)

export const hybridSearch = (query: string, options?: SearchOptions) =>
  vectorStoreAdapter.hybridSearch(query, options)

export const findSimilarContent = (
  contentId: string,
  contentType: string,
  options?: SearchOptions,
) => vectorStoreAdapter.findSimilarContent(contentId, contentType, options)

export const getContentStats = () => vectorStoreAdapter.getContentStats()

export const storeEmbedding = (
  contentId: string,
  contentType: string,
  language: string,
  content: string,
  embedding: number[],
  metadata?: Record<string, any>,
) =>
  vectorStoreAdapter.storeEmbedding(
    contentId,
    contentType,
    language,
    content,
    embedding,
    metadata,
  )

export const storeBatchEmbeddings = (
  embeddings: Array<{
    contentId: string
    contentType: string
    language: string
    content: string
    embedding: number[]
    metadata?: Record<string, any>
  }>,
) => vectorStoreAdapter.storeBatchEmbeddings(embeddings)

export const deleteEmbeddings = (contentType: string, language?: string) =>
  vectorStoreAdapter.deleteEmbeddings(contentType, language)

export const embeddingExists = (contentId: string, contentType: string) =>
  vectorStoreAdapter.embeddingExists(contentId, contentType)

export const initializeVectorStore = () => vectorStoreAdapter.initialize()

export const getVectorStoreType = () => vectorStoreAdapter.getVectorStoreType()

export const getPerformanceInfo = () => vectorStoreAdapter.getPerformanceInfo()
