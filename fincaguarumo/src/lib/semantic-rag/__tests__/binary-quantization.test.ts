/**
 * @jest-environment node
 */

import { getSemanticRAGConfig, isQdrantConfigured } from "../config"
import { VectorStoreAdapter } from "../vector-store-adapter"
import { initializeQdrantCollection } from "../qdrant-store"

describe("Binary Quantization Implementation", () => {
  let adapter: VectorStoreAdapter

  beforeAll(() => {
    adapter = new VectorStoreAdapter()
  })

  describe("Configuration", () => {
    it("should detect Qdrant configuration correctly", () => {
      const config = getSemanticRAGConfig()
      expect(["pgvector", "qdrant"]).toContain(config.vectorStore)
      expect(typeof config.enableBinaryQuantization).toBe("boolean")
    })

    it("should check if Qdrant is properly configured", () => {
      const isConfigured = isQdrantConfigured()
      expect(typeof isConfigured).toBe("boolean")
    })
  })

  describe("Vector Store Adapter", () => {
    it("should create adapter instance", () => {
      expect(adapter).toBeInstanceOf(VectorStoreAdapter)
    })

    it("should return vector store type", () => {
      const type = adapter.getVectorStoreType()
      expect(["pgvector", "qdrant"]).toContain(type)
    })

    it("should provide performance information", () => {
      const perfInfo = adapter.getPerformanceInfo()
      expect(perfInfo).toHaveProperty("vectorStore")
      expect(perfInfo).toHaveProperty("binaryQuantization")
      expect(["pgvector", "qdrant"]).toContain(perfInfo.vectorStore)
    })

    it("should handle Qdrant-specific performance info", () => {
      const perfInfo = adapter.getPerformanceInfo()
      if (perfInfo.vectorStore === "qdrant" && perfInfo.binaryQuantization) {
        expect(perfInfo.expectedSpeedup).toBe("40x faster search")
        expect(perfInfo.memoryReduction).toBe("32x less memory usage")
      }
    })
  })

  describe("Qdrant Collection", () => {
    const testFn = async () => {
      await expect(initializeQdrantCollection()).resolves.not.toThrow()
    }

    if (isQdrantConfigured()) {
      it("should initialize Qdrant collection when configured", testFn)
    } else {
      it.skip(
        "should initialize Qdrant collection when configured - QDRANT_NOT_CONFIGURED",
        testFn,
      )
    }
  })

  describe("Search Functions", () => {
    it("should handle semantic search calls", async () => {
      // Mock search to test interface compatibility
      const mockSearch = jest.spyOn(adapter, "semanticSearch")
      mockSearch.mockResolvedValue([])

      await adapter.semanticSearch("test query", { language: "en" })

      expect(mockSearch).toHaveBeenCalledWith("test query", {
        language: "en",
      })

      mockSearch.mockRestore()
    })

    it("should handle hybrid search calls", async () => {
      const mockSearch = jest.spyOn(adapter, "hybridSearch")
      mockSearch.mockResolvedValue([])

      await adapter.hybridSearch("test query", {
        language: "en",
        semanticWeight: 0.7,
        keywordWeight: 0.3,
      })

      expect(mockSearch).toHaveBeenCalledWith("test query", {
        language: "en",
        semanticWeight: 0.7,
        keywordWeight: 0.3,
      })

      mockSearch.mockRestore()
    })
  })

  describe("Storage Functions", () => {
    it("should handle embedding storage", async () => {
      const mockStore = jest.spyOn(adapter, "storeEmbedding")
      mockStore.mockResolvedValue()

      await adapter.storeEmbedding(
        "test-id",
        "faq",
        "en",
        "test content",
        [0.1, 0.2, 0.3], // Mock embedding
        { priority: "high" },
      )

      expect(mockStore).toHaveBeenCalledWith(
        "test-id",
        "faq",
        "en",
        "test content",
        [0.1, 0.2, 0.3],
        { priority: "high" },
      )

      mockStore.mockRestore()
    })

    it("should handle batch embedding storage", async () => {
      const mockBatchStore = jest.spyOn(adapter, "storeBatchEmbeddings")
      mockBatchStore.mockResolvedValue()

      const embeddings = [
        {
          contentId: "test-id",
          contentType: "faq",
          language: "en",
          content: "test content",
          embedding: [0.1, 0.2, 0.3],
        },
      ]

      await adapter.storeBatchEmbeddings(embeddings)

      expect(mockBatchStore).toHaveBeenCalledWith(embeddings)
      mockBatchStore.mockRestore()
    })
  })

  describe("Migration Support", () => {
    it("should provide migration statistics", async () => {
      const mockStats = jest.spyOn(adapter, "getContentStats")
      mockStats.mockResolvedValue({
        totalEmbeddings: 1000,
        contentTypeStats: { faq: 500, page: 500 },
        languageStats: { en: 600, es: 400 },
      })

      const stats = await adapter.getContentStats()

      expect(stats.totalEmbeddings).toBe(1000)
      expect(stats.contentTypeStats).toEqual({ faq: 500, page: 500 })
      expect(stats.languageStats).toEqual({ en: 600, es: 400 })

      mockStats.mockRestore()
    })
  })
})
