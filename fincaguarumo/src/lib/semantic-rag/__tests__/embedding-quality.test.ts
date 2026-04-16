/**
 * Tests for embedding quality consistency across languages
 */

import { generateEmbedding } from "../embeddings"
import { SupportedLanguage } from "../multilingual-preprocessing"

// Set up environment variables before importing
process.env.TOGETHER_API_KEY = "test-key"
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_API_KEY = "test-key"

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
    process.env.NEXT_PUBLIC_SUPABASE_API_KEY = "test-key"
  })

  describe("Semantic Consistency Across Languages", () => {
    it("should generate embeddings with consistent dimensions across languages", async () => {
      const testTexts = {
        en: "The weather is beautiful today",
        nl: "Het weer is vandaag mooi",
        es: "El tiempo está hermoso hoy",
        ru: "Ïîãîäà ïðåêðàñíûé ñåãîäíÿ",
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
      const dimensions = Object.values(embeddings).map(emb => emb.length)
      expect(new Set(dimensions).size).toBe(1) // All should have same length
      expect(dimensions[0]).toBe(768) // e5-base-instruct dimensions
    })

    it("should handle similar semantic concepts across languages", async () => {
      const conceptPairs = [
        {
          en: "beautiful flower",
          nl: "mooie bloem",
          es: "flor hermosa",
          ru: "êðàñèâûé öâåòîê",
          de: "schöne Blume",
        },
        {
          en: "fast car",
          nl: "snelle auto",
          es: "coche rápido",
          ru: "áûñòðàÿ ìàøèíà",
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
