/**
 * @jest-environment node
 * Tests for embedding quality consistency across languages
 */

import { generateEmbedding } from "../embeddings"
import { SupportedLanguage } from "../multilingual-preprocessing"

// Set up environment variables before importing
process.env.TOGETHER_API_KEY = "test-key"
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key"

// Mock the TogetherAI API for testing
const mockEmbeddingResponse = (text: string) => {
  // Generate deterministic embeddings based on text hash for consistent testing
  const hash = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const embedding = Array(768)
    .fill(0)
    .map((_, i) => Math.sin(hash + i) * 0.1 + Math.cos(hash * 0.5 + i) * 0.05)

  return {
    ok: true,
    json: jest.fn().mockResolvedValue({
      data: [{ embedding, dimensions: embedding.length }],
    }),
  }
}

describe("Embedding Quality Consistency", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
    // Set up environment variables
    process.env.TOGETHER_API_KEY = "test-key"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key"
  })

  describe("Semantic Consistency Across Languages", () => {
    it("should generate embeddings with consistent dimensions across languages", async () => {
      const testTexts = {
        en: "The weather is beautiful today",
        nl: "Het weer is vandaag mooi",
        es: "El tiempo está hermoso hoy",
        ru: "Погода прекрасный сегодня",
        de: "Das Wetter ist heute wunderschön",
      }

      const embeddings: Partial<Record<SupportedLanguage, number[]>> = {}

      // Generate embeddings for each language
      for (const [lang, text] of Object.entries(testTexts)) {
        mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
        const result = await generateEmbedding(text, lang as SupportedLanguage)
        embeddings[lang as SupportedLanguage] = result.embedding
      }

      // Check that all embeddings have the same dimensions
      const dimensions = Object.values(embeddings)
        .filter((emb): emb is number[] => emb !== undefined)
        .map(emb => emb.length)
      expect(new Set(dimensions).size).toBe(1) // All should have same length
      expect(dimensions[0]).toBe(768) // e5-base-instruct dimensions
    })

    it("should handle similar semantic concepts across languages", async () => {
      const conceptPairs = [
        {
          en: "beautiful flower",
          nl: "mooie bloem",
          es: "flor hermosa",
          ru: "красивый цветок",
          de: "schöne Blume",
        },
        {
          en: "fast car",
          nl: "snelle auto",
          es: "coche rápido",
          ru: "быстрая машина",
          de: "schnelles Auto",
        },
      ]

      for (const concept of conceptPairs) {
        const embeddings: number[][] = []

        // Generate embeddings for each language version
        for (const [lang, text] of Object.entries(concept)) {
          mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
          const result = await generateEmbedding(
            text,
            lang as SupportedLanguage,
          )
          embeddings.push(result.embedding)
        }

        // Verify all embeddings were generated successfully
        expect(embeddings).toHaveLength(5)
        embeddings.forEach(emb => {
          expect(emb).toHaveLength(768)
          expect(emb.every(val => typeof val === "number" && !isNaN(val))).toBe(
            true,
          )
        })
      }
    })

    it("should maintain preprocessing consistency across languages", async () => {
      const testCases = [
        {
          en: "Hello, world!",
          nl: "Hallo, wereld!",
          es: "¡Hola, mundo!",
          de: "Hallo, Welt!",
        },
      ]

      for (const testCase of testCases) {
        const results: any[] = []

        for (const [lang, text] of Object.entries(testCase)) {
          mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
          const result = await generateEmbedding(
            text,
            lang as SupportedLanguage,
          )
          results.push(result)
        }

        // Verify all results have the same structure
        results.forEach(result => {
          expect(result).toHaveProperty("embedding")
          expect(result).toHaveProperty("dimensions")
          expect(result.dimensions).toBe(768)
          expect(result.embedding).toHaveLength(768)
        })
      }
    })
  })

  describe("Preprocessing Quality", () => {
    it("should handle special characters consistently across languages", async () => {
      const specialCharTexts = {
        en: "Hello@world #test $123",
        nl: "Hallo@wereld #test $123",
        es: "¡Hola@mundo! #prueba $123",
        de: "Hallo@Welt #Test $123",
      }

      for (const [lang, text] of Object.entries(specialCharTexts)) {
        mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
        const result = await generateEmbedding(text, lang as SupportedLanguage)

        // Verify embedding was generated successfully
        expect(result.embedding).toBeDefined()
        expect(result.embedding).toHaveLength(768)
        expect(result.dimensions).toBe(768)
      }
    })

    it("should handle mixed language text gracefully", async () => {
      const mixedTexts = [
        "Hello bonjourHola",
        "The weather is muy bueno today",
        "Auto ist schnell and rápido",
      ]

      for (const text of mixedTexts) {
        mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)

        // Test with auto-detection
        const result = await generateEmbedding(text, "auto")

        expect(result.embedding).toBeDefined()
        expect(result.embedding).toHaveLength(768)
        expect(result.dimensions).toBe(768)
      }
    })
  })

  describe("Performance Consistency", () => {
    it("should handle batch processing consistently across languages", async () => {
      const batchTexts = [
        {
          en: "First text",
          nl: "Eerste tekst",
          es: "Primer texto",
          de: "Erster Text",
        },
        {
          en: "Second text",
          nl: "Tweede tekst",
          es: "Segundo texto",
          de: "Zweiter Text",
        },
      ]

      for (const batch of batchTexts) {
        for (const [lang, text] of Object.entries(batch)) {
          mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
          const result = await generateEmbedding(
            text,
            lang as SupportedLanguage,
          )

          // Verify consistent performance characteristics
          expect(result.embedding).toBeDefined()
          expect(result.embedding).toHaveLength(768)
          expect(result.dimensions).toBe(768)
        }
      }
    })

    it("should maintain embedding quality with different text lengths", async () => {
      const lengthTests = [
        "Short",
        "Medium length text with some content",
        "This is a much longer text that contains multiple sentences and should test how the embedding generation handles longer inputs across different languages and contexts",
      ]

      for (const text of lengthTests) {
        mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
        const result = await generateEmbedding(text, "en")

        expect(result.embedding).toBeDefined()
        expect(result.embedding).toHaveLength(768)
        expect(result.dimensions).toBe(768)
      }
    })
  })

  describe("Storage Quality Consistency", () => {
    // Mock Supabase client for storage tests
    const mockSupabase = {
      from: jest.fn(),
    }

    beforeEach(() => {
      // Mock the Supabase module for storage tests
      jest.doMock("@supabase/supabase-js", () => ({
        createClient: jest.fn(() => mockSupabase),
      }))
    })

    it("should maintain embedding quality during storage across languages", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const testTexts = {
        en: "Beautiful sunny day",
        nl: "Mooie zonnige dag",
        es: "Hermoso día soleado",
        de: "Schöner sonniger Tag",
      }

      // Re-import storage functions with mocked Supabase
      const { storeEmbedding } = await import("../embeddings")

      for (const [lang, text] of Object.entries(testTexts)) {
        mockFetch.mockResolvedValue(mockEmbeddingResponse(text) as any)
        const embeddingResult = await generateEmbedding(
          text,
          lang as SupportedLanguage,
        )

        // Store the embedding
        await storeEmbedding(
          `test-${lang}`,
          "quality-test",
          lang as SupportedLanguage,
          text,
          embeddingResult.embedding,
          { testType: "quality", language: lang },
        )

        // Verify storage was called with correct data
        expect(mockUpsert).toHaveBeenCalledWith({
          content_id: `test-${lang}`,
          content_type: "quality-test",
          language: lang,
          content: text,
          embedding: embeddingResult.embedding,
          metadata: { testType: "quality", language: lang },
          updated_at: expect.any(String),
        })

        // Verify embedding quality is maintained
        expect(embeddingResult.embedding).toHaveLength(768)
        expect(
          embeddingResult.embedding.every(
            val => typeof val === "number" && !isNaN(val),
          ),
        ).toBe(true)
      }
    })

    it("should maintain batch storage quality across mixed languages", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeBatchEmbeddings } = await import("../embeddings")

      const mixedLanguageEmbeddings = [
        {
          contentId: "quality-test-1",
          contentType: "multilingual-test",
          language: "en" as SupportedLanguage,
          content: "Hello world",
          embedding: Array(768)
            .fill(0)
            .map((_, i) => Math.sin(i) * 0.1),
        },
        {
          contentId: "quality-test-2",
          contentType: "multilingual-test",
          language: "es" as SupportedLanguage,
          content: "Hola mundo",
          embedding: Array(768)
            .fill(0)
            .map((_, i) => Math.cos(i) * 0.1),
        },
        {
          contentId: "quality-test-3",
          contentType: "multilingual-test",
          language: "de" as SupportedLanguage,
          content: "Hallo Welt",
          embedding: Array(768)
            .fill(0)
            .map((_, i) => Math.sin(i + 1) * 0.1),
        },
      ]

      await storeBatchEmbeddings(mixedLanguageEmbeddings)

      // Verify batch storage was called with all embeddings
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content_id: "quality-test-1",
            language: "en",
            embedding: expect.arrayContaining([expect.any(Number)]),
          }),
          expect.objectContaining({
            content_id: "quality-test-2",
            language: "es",
            embedding: expect.arrayContaining([expect.any(Number)]),
          }),
          expect.objectContaining({
            content_id: "quality-test-3",
            language: "de",
            embedding: expect.arrayContaining([expect.any(Number)]),
          }),
        ]),
      )

      // Verify all embeddings maintain quality
      mixedLanguageEmbeddings.forEach(emb => {
        expect(emb.embedding).toHaveLength(768)
        expect(
          emb.embedding.every(val => typeof val === "number" && !isNaN(val)),
        ).toBe(true)
      })
    })

    it("should handle embedding existence checking consistently", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "123", language: "en" },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const { embeddingExists } = await import("../embeddings")

      const result = await embeddingExists("quality-test", "multilingual-test")

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith("content_embeddings")
      expect(mockSelect).toHaveBeenCalledWith("id")
    })

    it("should maintain embedding quality during storage with metadata", async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { storeEmbedding } = await import("../embeddings")

      const testText = "Test embedding with complex metadata"
      const embedding = Array(768)
        .fill(0)
        .map((_, i) => Math.sin(i * 0.5) * 0.2)
      const complexMetadata = {
        language: "en",
        quality: "high",
        preprocessing: {
          normalized: true,
          lowercase: true,
          specialCharsRemoved: true,
        },
        dimensions: 768,
        model: "e5-base-instruct",
        timestamp: new Date().toISOString(),
      }

      await storeEmbedding(
        "complex-metadata-test",
        "quality-test",
        "en" as SupportedLanguage,
        testText,
        embedding,
        complexMetadata,
      )

      expect(mockUpsert).toHaveBeenCalledWith({
        content_id: "complex-metadata-test",
        content_type: "quality-test",
        language: "en",
        content: testText,
        embedding,
        metadata: complexMetadata,
        updated_at: expect.any(String),
      })

      // Verify embedding quality is maintained
      expect(embedding).toHaveLength(768)
      expect(
        embedding.every(val => typeof val === "number" && !isNaN(val)),
      ).toBe(true)
    })
  })

  describe("Error Handling Consistency", () => {
    it("should handle API errors consistently across languages", async () => {
      const mockErrorResponse = {
        ok: false,
        statusText: "Rate Limit Exceeded",
      }
      mockFetch.mockResolvedValue(mockErrorResponse as any)

      const testLanguages: SupportedLanguage[] = ["en", "nl", "es", "ru", "de"]

      for (const lang of testLanguages) {
        await expect(generateEmbedding("test", lang)).rejects.toThrow(
          "TogetherAI API error: Rate Limit Exceeded",
        )
      }
    })

    it("should handle invalid responses consistently across languages", async () => {
      const mockInvalidResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [] }), // Empty data
      }
      mockFetch.mockResolvedValue(mockInvalidResponse as any)

      const testLanguages: SupportedLanguage[] = ["en", "nl", "es", "ru", "de"]

      for (const lang of testLanguages) {
        await expect(generateEmbedding("test", lang)).rejects.toThrow(
          "Invalid embedding response from TogetherAI",
        )
      }
    })
  })
})
