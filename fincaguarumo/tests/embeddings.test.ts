/**
 * Test suite for Role-Based Embedding System - Phase 1
 * Tests embedding-specific acceptance criteria from FG-29-role-based-model-provider.md
 */

import {
  generateEmbedding,
  generateBatchEmbeddings,
  storeEmbedding,
  embeddingExists,
  getEmbeddingDimensions,
  validateEmbedding,
} from "../src/lib/semantic-rag/embeddings"

// Mock environment variables
const originalEnv = process.env

describe("Role-Based Embedding System", () => {
  beforeEach(() => {
    jest.resetModules()
    const originalEnv = process.env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("A5: Local/Remote embedding roles", () => {
    test("should use local embedding model in development environment", async () => {
      // Set environment for development testing
      const mockEnv = { ...originalEnv }
      mockEnv.NODE_ENV = "development"
      mockEnv.EMBED_MODEL_LOCAL_PROVIDER = "local"
      mockEnv.EMBED_MODEL_LOCAL_MODEL_ID = "e5-base-instruct"
      mockEnv.EMBED_MODEL_LOCAL_FALLBACKS = "together:intfloat/e5-base-instruct"
      process.env = mockEnv

      const result = await generateEmbedding("test text", "en")

      expect(result.embedding).toBeDefined()
      expect(result.embedding).toBeInstanceOf(Array)
      expect(result.dimensions).toBeGreaterThan(0)
      expect(result.dimensions).toBe(768) // e5-base-instruct dimensions
    }, 10000)

    test("should fallback to remote provider when local fails", async () => {
      // Set environment for development testing
      const mockEnv = { ...originalEnv }
      mockEnv.NODE_ENV = "development"
      mockEnv.EMBED_MODEL_LOCAL_PROVIDER = "local"
      mockEnv.EMBED_MODEL_LOCAL_MODEL_ID = "local-model-that-fails"
      mockEnv.EMBED_MODEL_REMOTE_PROVIDER = "together"
      mockEnv.EMBED_MODEL_REMOTE_MODEL_ID = "intfloat/e5-base-instruct"
      process.env = mockEnv

      // Mock local provider to fail
      jest.mock("../src/lib/semantic-rag/embeddings", () => ({
        ...jest.requireActual("../src/lib/semantic-rag/embeddings"),
        generateEmbedding: jest
          .fn()
          .mockImplementation(async (text: string) => {
            if (process.env.EMBED_MODEL_LOCAL_PROVIDER === "local") {
              throw new Error("Local model unavailable")
            }
            // Fall back to remote implementation
            return jest
              .requireActual("../src/lib/semantic-rag/embeddings")
              .generateEmbedding(text)
          }),
      }))

      const result = await generateEmbedding("test text", "en")

      expect(result.embedding).toBeDefined()
      expect(result.dimensions).toBe(768)
    }, 10000)

    test("should use remote embedding model in production environment", async () => {
      // Set environment for production testing
      const mockEnv = { ...originalEnv }
      mockEnv.NODE_ENV = "production"
      mockEnv.EMBED_MODEL_REMOTE_PROVIDER = "together"
      mockEnv.EMBED_MODEL_REMOTE_MODEL_ID = "intfloat/e5-base-instruct"
      mockEnv.EMBED_MODEL_REMOTE_FALLBACKS = "openai:text-embedding-3-small"
      process.env = mockEnv

      const result = await generateEmbedding("test text", "en")

      expect(result.embedding).toBeDefined()
      expect(result.dimensions).toBe(768)
    }, 10000)

    test("should handle embedding fallback chains", async () => {
      process.env.EMBED_MODEL_REMOTE_PROVIDER = "together"
      process.env.EMBED_MODEL_REMOTE_MODEL_ID = "intfloat/e5-base-instruct"
      process.env.EMBED_MODEL_REMOTE_FALLBACKS =
        "openai:text-embedding-3-small,cohere:embed-english-v3.0"

      // Mock first provider to fail, second to succeed
      let attemptCount = 0
      jest.mock("node-fetch", () => {
        return jest.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount === 1) {
            return Promise.reject(new Error("Rate limit exceeded"))
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    embedding: new Array(768).fill(0.1) as number[],
                  },
                ],
              }),
          })
        })
      })

      const result = await generateEmbedding("test text", "en")

      expect(result.embedding).toBeDefined()
      expect(result.dimensions).toBe(768)
      expect(attemptCount).toBe(2) // Should have tried fallback
    }, 15000)
  })

  describe("Embedding validation and quality", () => {
    test("should validate embedding format correctly", () => {
      const validEmbedding = new Array(768).fill(0.1).map((_, i) => i * 0.01)
      const invalidEmbedding = [1, 2, NaN, Infinity]
      const wrongSizeEmbedding = new Array(500).fill(0.1)

      expect(validateEmbedding(validEmbedding)).toBe(true)
      expect(validateEmbedding(invalidEmbedding)).toBe(false)
      expect(validateEmbedding(wrongSizeEmbedding)).toBe(false)
    })

    test("should return correct embedding dimensions", () => {
      const dimensions = getEmbeddingDimensions()
      expect(dimensions).toBe(768)
    })

    test("should handle multilingual preprocessing", async () => {
      const testCases = [
        { text: "Hello world", language: "en" as const },
        { text: "Hola mundo", language: "es" as const },
        { text: "Hallo wereld", language: "nl" as const },
        { text: "Привет мир", language: "ru" as const },
        { text: "Hallo Welt", language: "de" as const },
      ]

      for (const { text, language } of testCases) {
        const result = await generateEmbedding(text, language)

        expect(result.embedding).toBeDefined()
        expect(result.dimensions).toBe(768)
        expect(result.embedding.length).toBe(768)
      }
    }, 30000)
  })

  describe("Batch embedding operations", () => {
    test("should process batch embeddings efficiently", async () => {
      const texts = [
        "First text",
        "Second text",
        "Third text",
        "Fourth text",
        "Fifth text",
      ]

      const results = await generateBatchEmbeddings(texts, "en")

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.embedding).toBeDefined()
        expect(result.dimensions).toBe(768)
      })
    }, 20000)

    test("should handle batch size limits", async () => {
      // Create 150 texts (exceeds batch size of 100)
      const texts = Array.from({ length: 150 }, (_, i) => `Text ${i + 1}`)

      const results = await generateBatchEmbeddings(texts, "en")

      expect(results).toHaveLength(150)
      results.forEach(result => {
        expect(result.embedding).toBeDefined()
        expect(result.dimensions).toBe(768)
      })
    }, 60000)

    test("should handle batch failures gracefully", async () => {
      const texts = ["Valid text", "Invalid text"]

      // Mock batch request to fail for second item
      jest.mock("node-fetch", () => {
        return jest.fn().mockImplementation((url, options) => {
          const body = JSON.parse(options.body)
          if (body.input.includes("Invalid text")) {
            return Promise.reject(new Error("Invalid content"))
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    embedding: new Array(768).fill(0.1) as number[],
                  },
                ],
              }),
          })
        })
      })

      await expect(generateBatchEmbeddings(texts, "en")).rejects.toThrow(
        "Invalid content",
      )
    })
  })

  describe("Storage operations", () => {
    test("should store embedding with metadata", async () => {
      const embedding = new Array(768).fill(0.1)
      const metadata = { source: "test", version: "1.0" }

      // Mock Supabase client
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockResolvedValue({ error: null }),
        }),
      }

      jest.mock("@supabase/supabase-js", () => ({
        createClient: jest.fn().mockReturnValue(mockSupabase),
      }))

      await expect(
        storeEmbedding(
          "test-id",
          "test-type",
          "en",
          "test content",
          embedding,
          metadata,
        ),
      ).resolves.not.toThrow()
    })

    test("should check embedding existence", async () => {
      // Mock Supabase client for existence check
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: { id: "123" }, error: null }),
              }),
            }),
          }),
        }),
      }

      jest.mock("@supabase/supabase-js", () => ({
        createClient: jest.fn().mockReturnValue(mockSupabase),
      }))

      const exists = await embeddingExists("test-id", "test-type")
      expect(exists).toBe(true)
    })

    test("should handle storage errors gracefully", async () => {
      const embedding = new Array(768).fill(0.1)

      // Mock Supabase to return error
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          upsert: jest
            .fn()
            .mockResolvedValue({ error: new Error("Database error") }),
        }),
      }

      jest.mock("@supabase/supabase-js", () => ({
        createClient: jest.fn().mockReturnValue(mockSupabase),
      }))

      await expect(
        storeEmbedding("test-id", "test-type", "en", "test content", embedding),
      ).rejects.toThrow("Failed to store embedding")
    })
  })

  describe("Error handling and edge cases", () => {
    test("should handle API timeout", async () => {
      // Mock fetch to timeout
      jest.mock("node-fetch", () => {
        return jest.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), 31000) // > 30s timeout
          })
        })
      })

      await expect(generateEmbedding("test text", "en")).rejects.toThrow(
        "Failed to generate embedding",
      )
    }, 35000)

    test("should handle rate limiting with exponential backoff", async () => {
      let attemptCount = 0
      const startTime = Date.now()

      // Mock rate limiting then success
      jest.mock("node-fetch", () => {
        return jest.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount <= 2) {
            const error = new Error("Rate limit exceeded")
            ;(error as any).status = 429
            return Promise.reject(error)
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    embedding: new Array(768).fill(0.1) as number[],
                  },
                ],
              }),
          })
        })
      })

      const result = await generateEmbedding("test text", "en")
      const totalTime = Date.now() - startTime

      expect(result.embedding).toBeDefined()
      expect(attemptCount).toBe(3) // Should retry on rate limit
      expect(totalTime).toBeGreaterThan(2000) // Should include backoff delays
    }, 15000)

    test("should handle empty input gracefully", async () => {
      await expect(generateEmbedding("", "en")).rejects.toThrow()
    })

    test("should handle very long text", async () => {
      const longText = "a".repeat(10000) // 10k characters

      const result = await generateEmbedding(longText, "en")

      expect(result.embedding).toBeDefined()
      expect(result.dimensions).toBe(768)
    }, 20000)
  })
})
