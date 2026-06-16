import { getSemanticRAGConfig, isQdrantConfigured } from "./config"

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
  private _useQdrant: boolean | undefined
  private _pgvectorStore: any
  private _qdrantStore: any
  private _embeddingFunctions: any

  private get useQdrant(): boolean {
    if (this._useQdrant === undefined) {
      this._useQdrant = isQdrantConfigured()

      if (this._useQdrant) {
        console.log("Using Qdrant vector store with binary quantization")
      } else {
        console.log("Using pgvector vector store")
      }
    }
    return this._useQdrant
  }

  private async getPgvectorStore() {
    if (!this._pgvectorStore) {
      this._pgvectorStore = await import("./vector-store")
    }
    return this._pgvectorStore
  }

  private async getQdrantStore() {
    if (!this._qdrantStore) {
      this._qdrantStore = await import("./qdrant-store")
    }
    return this._qdrantStore
  }

  private async getEmbeddingFunctions() {
    if (!this._embeddingFunctions) {
      this._embeddingFunctions = await import("./embeddings")
    }
    return this._embeddingFunctions
  }

  /**
   * Perform semantic search using the configured vector store
   */
  async semanticSearch(
    query: string,
    options: SearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    console.log(`Starting semantic search for query: "${query}"`)

    if (this.useQdrant) {
      try {
        const qdrantStore = await this.getQdrantStore()
        const results = await qdrantStore.semanticSearch(query, options)
        return results.map((r: any) => ({
          ...r,
          language: r.language as string,
        }))
      } catch (error) {
        console.warn(
          "Qdrant semantic search failed, falling back to pgvector:",
          error,
        )
        const pgvectorStore = await this.getPgvectorStore()
        return pgvectorStore.semanticSearch(query, options)
      }
    } else {
      const pgvectorStore = await this.getPgvectorStore()
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
        const qdrantStore = await this.getQdrantStore()
        const results = await qdrantStore.hybridSearch(query, options)
        return results.map((r: any) => ({
          ...r,
          language: r.language as string,
        }))
      } catch (error) {
        console.warn(
          "Qdrant hybrid search failed, falling back to pgvector:",
          error,
        )
        const pgvectorStore = await this.getPgvectorStore()
        return pgvectorStore.hybridSearch(query, options)
      }
    } else {
      const pgvectorStore = await this.getPgvectorStore()
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
        const qdrantStore = await this.getQdrantStore()
        const results = await qdrantStore.findSimilarContent(
          contentId,
          contentType,
          options,
        )
        return results.map((r: any) => ({
          ...r,
          language: r.language as string,
        }))
      } catch (error) {
        console.warn(
          "Qdrant findSimilarContent failed, falling back to pgvector:",
          error,
        )
        const pgvectorStore = await this.getPgvectorStore()
        return pgvectorStore.findSimilarContent(contentId, contentType, options)
      }
    } else {
      const pgvectorStore = await this.getPgvectorStore()
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
        const qdrantStore = await this.getQdrantStore()
        return qdrantStore.getContentStats()
      } catch (error) {
        console.warn(
          "Qdrant getContentStats failed, falling back to pgvector:",
          error,
        )
        const pgvectorStore = await this.getPgvectorStore()
        return pgvectorStore.getContentStats()
      }
    } else {
      const pgvectorStore = await this.getPgvectorStore()
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
        const qdrantStore = await this.getQdrantStore()
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
        const embeddingFunctions = await this.getEmbeddingFunctions()
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
      const embeddingFunctions = await this.getEmbeddingFunctions()
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
        const qdrantStore = await this.getQdrantStore()
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
        const embeddingFunctions = await this.getEmbeddingFunctions()
        return embeddingFunctions.storeBatchEmbeddings(castEmbeddings)
      }
    } else {
      // Cast language to satisfy type constraint
      const castEmbeddings = embeddings.map(e => ({
        ...e,
        language: e.language as any,
      }))
      const embeddingFunctions = await this.getEmbeddingFunctions()
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
        const qdrantStore = await this.getQdrantStore()
        return qdrantStore.deleteEmbeddings(contentType, language)
      } catch (error) {
        console.warn(
          "Qdrant deleteEmbeddings failed, falling back to pgvector:",
          error,
        )
        const pgvectorStore = await this.getPgvectorStore()
        return pgvectorStore.deleteEmbeddings(contentType, language)
      }
    } else {
      const pgvectorStore = await this.getPgvectorStore()
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
        const qdrantStore = await this.getQdrantStore()
        return qdrantStore.embeddingExists(contentId, contentType)
      } catch (error) {
        console.warn(
          "Qdrant embeddingExists failed, falling back to pgvector:",
          error,
        )
        const embeddingFunctions = await this.getEmbeddingFunctions()
        return embeddingFunctions.embeddingExists(contentId, contentType)
      }
    } else {
      const embeddingFunctions = await this.getEmbeddingFunctions()
      return embeddingFunctions.embeddingExists(contentId, contentType)
    }
  }

  /**
   * Initialize the vector store if needed
   */
  async initialize(): Promise<void> {
    if (this.useQdrant) {
      try {
        const qdrantStore = await this.getQdrantStore()
        const { initializeQdrantCollection } = qdrantStore
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

// Lazy singleton getter
let vectorStoreAdapterInstance: VectorStoreAdapter | undefined

export function getVectorStoreAdapter(): VectorStoreAdapter {
  if (!vectorStoreAdapterInstance) {
    vectorStoreAdapterInstance = new VectorStoreAdapter()
  }
  return vectorStoreAdapterInstance
}

// For backward compatibility, export a getter that creates the instance on first access
export const vectorStoreAdapter = new Proxy(
  {},
  {
    get(target, prop) {
      const adapter = getVectorStoreAdapter()
      return adapter[prop as keyof VectorStoreAdapter]
    },
  },
) as VectorStoreAdapter

// Export individual functions for backward compatibility
export const semanticSearch = (query: string, options?: SearchOptions) =>
  getVectorStoreAdapter().semanticSearch(query, options)

export const hybridSearch = (query: string, options?: SearchOptions) =>
  getVectorStoreAdapter().hybridSearch(query, options)

export const findSimilarContent = (
  contentId: string,
  contentType: string,
  options?: SearchOptions,
) => getVectorStoreAdapter().findSimilarContent(contentId, contentType, options)

export const getContentStats = () => getVectorStoreAdapter().getContentStats()

export const storeEmbedding = (
  contentId: string,
  contentType: string,
  language: string,
  content: string,
  embedding: number[],
  metadata?: Record<string, any>,
) =>
  getVectorStoreAdapter().storeEmbedding(
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
) => getVectorStoreAdapter().storeBatchEmbeddings(embeddings)

export const deleteEmbeddings = (contentType: string, language?: string) =>
  getVectorStoreAdapter().deleteEmbeddings(contentType, language)

export const embeddingExists = (contentId: string, contentType: string) =>
  getVectorStoreAdapter().embeddingExists(contentId, contentType)

export const initializeVectorStore = () => getVectorStoreAdapter().initialize()

export const getVectorStoreType = () =>
  getVectorStoreAdapter().getVectorStoreType()

export const getPerformanceInfo = () =>
  getVectorStoreAdapter().getPerformanceInfo()
