/**
 * Unit tests for embedding generation with multilingual support
 */

import {
  generateEmbedding,
  generateBatchEmbeddings,
  storeEmbedding,
  storeBatchEmbeddings,
  embeddingExists,
} from "../embeddings"
import { SupportedLanguage } from "../multilingual-preprocessing"

// Mock the TogetherAI API
global.fetch = jest.fn()

describe("Embedding Generation", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe("Single Embedding Generation", () => {
    it("should generate embedding with multilingual preprocessing", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], // 8 dimensions for testing
            },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const result = await generateEmbedding("Hello world", "en")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.together.xyz/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer undefined",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "intfloat/e5-base-instruct",
            input: "hello world",
          }),
        },
      )

      expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])
      expect(result.dimensions).toBe(8)
    })

    it("should handle auto language detection", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
            },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await generateEmbedding("The weather is nice today", "auto")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.together.xyz/v1/embeddings",
        expect.objectContaining({
          body: JSON.stringify({
            model: "intfloat/e5-base-instruct",
            input: "the weather is nice today",
          }),
        }),
      )
    })

    it("should handle API errors gracefully", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Bad Request",
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(generateEmbedding("test", "en")).rejects.toThrow(
        "TogetherAI API error: Bad Request",
      )
    })

    it("should handle invalid API response", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [], // Empty data array
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      await expect(generateEmbedding("test", "en")).rejects.toThrow(
        "Invalid embedding response from TogetherAI",
      )
    })
  })

  describe("Batch Embedding Generation", () => {
    it("should generate batch embeddings with preprocessing", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            { embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8] },
            { embedding: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1] },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const texts = ["Hello world", "Goodbye world"]
      const result = await generateBatchEmbeddings(texts, "en")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.together.xyz/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer undefined",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "intfloat/e5-base-instruct",
            input: ["hello world", "goodbye world"],
          }),
        },
      )

      expect(result).toHaveLength(2)
      expect(result[0].embedding).toEqual([
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
      ])
      expect(result[1].embedding).toEqual([
        0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1,
      ])
    })

    it("should handle batch size limits", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: Array(150)
            .fill()
            .map((_, i) => ({
              embedding: Array(8)
                .fill()
                .map((_, j) => (i + j) * 0.1),
            })),
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const texts = Array(150)
        .fill()
        .map((_, i) => `Text ${i}`)
      const result = await generateBatchEmbeddings(texts, "en")

      expect(result).toHaveLength(150)
      expect(mockFetch).toHaveBeenCalledTimes(2) // Should be called twice due to batch size limit
    })

    it("should handle batch API errors", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Too Many Requests",
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const texts = ["text1", "text2"]

      await expect(generateBatchEmbeddings(texts, "en")).rejects.toThrow(
        "TogetherAI API error: Too Many Requests",
      )
    })
  })

  describe("Embedding Storage", () => {
    // Mock Supabase client
    const mockSupabase = {
      from: jest.fn(),
    }

    beforeEach(() => {
      // Reset environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key"
      process.env.TOGETHER_API_KEY = "test-together-key"

      // Mock the Supabase module
      jest.doMock("@supabase/supabase-js", () => ({
        createClient: jest.fn(() => mockSupabase),
      }))
    })

    afterEach(() => {
      jest.resetModules()
    })

    it("should store single embedding successfully", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      // Re-import the module to get mocked Supabase
      const { storeEmbedding } = await import("../embeddings")

      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

      await expect(
        storeEmbedding("test-id", "test-type", "en", "test content", embedding),
      ).resolves.not.toThrow()

      expect(mockSupabase.from).toHaveBeenCalledWith("content_embeddings")
      expect(mockUpsert).toHaveBeenCalledWith({
        content_id: "test-id",
        content_type: "test-type",
        language: "en",
        content: "test content",
        embedding,
        metadata: {},
        updated_at: expect.any(String),
      })
    })

    it("should store single embedding with metadata", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeEmbedding } = await import("../embeddings")

      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
      const metadata = { source: "test", priority: 1 }

      await storeEmbedding(
        "test-id",
        "test-type",
        "es",
        "contenido de prueba",
        embedding,
        metadata,
      )

      expect(mockUpsert).toHaveBeenCalledWith({
        content_id: "test-id",
        content_type: "test-type",
        language: "es",
        content: "contenido de prueba",
        embedding,
        metadata,
        updated_at: expect.any(String),
      })
    })

    it("should handle storage errors for single embedding", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        error: { message: "Database connection failed" },
      })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeEmbedding } = await import("../embeddings")

      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

      await expect(
        storeEmbedding("test-id", "test-type", "en", "test content", embedding),
      ).rejects.toThrow("Failed to store embedding: Database connection failed")
    })

    it("should store batch embeddings successfully", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeBatchEmbeddings } = await import("../embeddings")

      const embeddings = [
        {
          contentId: "test-1",
          contentType: "test-type",
          language: "en" as SupportedLanguage,
          content: "test content 1",
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        },
        {
          contentId: "test-2",
          contentType: "test-type",
          language: "es" as SupportedLanguage,
          content: "test content 2",
          embedding: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
        },
      ]

      await storeBatchEmbeddings(embeddings)

      expect(mockSupabase.from).toHaveBeenCalledWith("content_embeddings")
      expect(mockUpsert).toHaveBeenCalledWith([
        {
          content_id: "test-1",
          content_type: "test-type",
          language: "en",
          content: "test content 1",
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
          metadata: {},
          updated_at: expect.any(String),
        },
        {
          content_id: "test-2",
          content_type: "test-type",
          language: "es",
          content: "test content 2",
          embedding: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
          metadata: {},
          updated_at: expect.any(String),
        },
      ])
    })

    it("should store batch embeddings with metadata", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeBatchEmbeddings } = await import("../embeddings")

      const embeddings = [
        {
          contentId: "test-1",
          contentType: "test-type",
          language: "en" as SupportedLanguage,
          content: "test content 1",
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
          metadata: { source: "manual" },
        },
        {
          contentId: "test-2",
          contentType: "test-type",
          language: "es" as SupportedLanguage,
          content: "test content 2",
          embedding: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
          metadata: { source: "auto", priority: 2 },
        },
      ]

      await storeBatchEmbeddings(embeddings)

      expect(mockUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          content_id: "test-1",
          metadata: { source: "manual" },
        }),
        expect.objectContaining({
          content_id: "test-2",
          metadata: { source: "auto", priority: 2 },
        }),
      ])
    })

    it("should handle storage errors for batch embeddings", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        error: { message: "Batch insert failed" },
      })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeBatchEmbeddings } = await import("../embeddings")

      const embeddings = [
        {
          contentId: "test-1",
          contentType: "test-type",
          language: "en" as SupportedLanguage,
          content: "test content 1",
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        },
      ]

      await expect(storeBatchEmbeddings(embeddings)).rejects.toThrow(
        "Failed to store batch embeddings: Batch insert failed",
      )
    })

    it("should check if embedding exists", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "123" },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const { embeddingExists } = await import("../embeddings")

      const result = await embeddingExists("test-id", "test-type")

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith("content_embeddings")
      expect(mockSelect).toHaveBeenCalledWith("id")
    })

    it("should return false when embedding does not exist", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" }, // Not found error code
            }),
          }),
        }),
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const { embeddingExists } = await import("../embeddings")

      const result = await embeddingExists("test-id", "test-type")

      expect(result).toBe(false)
    })

    it("should handle database errors when checking embedding existence", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Connection failed" },
            }),
          }),
        }),
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const { embeddingExists } = await import("../embeddings")

      const result = await embeddingExists("test-id", "test-type")

      expect(result).toBe(false) // Should return false on error
    })
  })

  describe("Multilingual Support", () => {
    it("should preprocess different languages correctly", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
            },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // Test Dutch preprocessing
      await generateEmbedding("Ik kan het niet geloven!", "nl")
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.together.xyz/v1/embeddings",
        expect.objectContaining({
          body: JSON.stringify({
            model: "intfloat/e5-base-instruct",
            input: "ik kan het niet geloven",
          }),
        }),
      )

      mockFetch.mockClear()
      mockFetch.mockResolvedValue(mockResponse as any)

      // Test German preprocessing
      await generateEmbedding("Müller geht nach über", "de")
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.together.xyz/v1/embeddings",
        expect.objectContaining({
          body: JSON.stringify({
            model: "intfloat/e5-base-instruct",
            input: "mueller geht nach ueber",
          }),
        }),
      )
    })

    it("should handle fallback for unsupported languages", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
            },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // This should fallback to English preprocessing
      await generateEmbedding("Bonjour le monde", "fr" as any)

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.together.xyz/v1/embeddings",
        expect.objectContaining({
          body: JSON.stringify({
            model: "intfloat/e5-base-instruct",
            input: expect.stringContaining("bonjour le monde"), // Should be preprocessed
          }),
        }),
      )
    })
  })
})
