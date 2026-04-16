/**
 * Tests for multilingual preprocessing quality and consistency
 */

import {
  preprocessText,
  preprocessTextWithFallback,
  SupportedLanguage,
} from "../multilingual-preprocessing"

describe("Multilingual Quality and Consistency", () => {
  describe("Preprocessing Consistency", () => {
    it("should handle similar semantic concepts across languages", () => {
      const conceptPairs = [
        {
          en: "beautiful flower",
          nl: "mooie bloem",
          es: "flor hermosa",
          de: "schöne Blume",
        },
        {
          en: "fast car",
          nl: "snelle auto",
          es: "coche rápido",
          de: "schnelles Auto",
        },
      ]

      for (const concept of conceptPairs) {
        const results: any[] = []

        // Generate preprocessing results for each language version
        for (const [lang, text] of Object.entries(concept)) {
          const result = preprocessText(text, lang as SupportedLanguage)
          results.push(result)
        }

        // Verify all results have consistent structure
        results.forEach(result => {
          expect(result).toHaveProperty("processedText")
          expect(result).toHaveProperty("detectedLanguage")
          expect(result).toHaveProperty("originalLanguage")
          expect(result).toHaveProperty("preprocessingSteps")
          expect(result.preprocessingSteps).toBeInstanceOf(Array)
        })

        // Verify language detection worked correctly
        results.forEach((result, index) => {
          const expectedLang = Object.keys(concept)[index] as SupportedLanguage
          expect(result.detectedLanguage).toBe(expectedLang)
          expect(result.originalLanguage).toBe(expectedLang)
        })
      }
    })

    it("should maintain preprocessing quality across different text lengths", () => {
      const lengthTests = [
        "Short",
        "Medium length text with some content",
        "This is a much longer text that contains multiple sentences and should test how the preprocessing handles longer inputs across different languages and contexts with various punctuation marks and special characters",
      ]

      const languages: SupportedLanguage[] = ["en", "nl", "es", "de"]

      for (const text of lengthTests) {
        for (const lang of languages) {
          const result = preprocessText(text, lang)

          // Verify consistent preprocessing structure
          expect(result.processedText).toBeDefined()
          expect(typeof result.processedText).toBe("string")
          expect(result.processedText.length).toBeGreaterThan(0)
          expect(result.detectedLanguage).toBe(lang)
          expect(result.originalLanguage).toBe(lang)
          expect(result.preprocessingSteps.length).toBeGreaterThan(0)
        }
      }
    })

    it("should handle special characters consistently across languages", () => {
      const specialCharTexts = {
        en: "Hello@world #test $123",
        nl: "Hallo@wereld #test $123",
        es: "¡Hola@mundo! #prueba $123",
        de: "Hallo@Welt #Test $123",
      }

      for (const [lang, text] of Object.entries(specialCharTexts)) {
        const result = preprocessText(text, lang as SupportedLanguage)

        // Verify special characters are handled
        expect(result.processedText).toBeDefined()
        expect(result.processedText).not.toContain("@")
        expect(result.processedText).not.toContain("#")
        expect(result.processedText).not.toContain("$")
        expect(result.preprocessingSteps).toContain(
          "Removed special characters",
        )
      }
    })
  })

  describe("Language Detection Quality", () => {
    it("should correctly detect languages with high confidence", () => {
      const languageSamples = {
        en: [
          "The quick brown fox jumps over the lazy dog",
          "Weather is sunny and warm today",
          "I enjoy reading books and drinking coffee",
        ],
        nl: [
          "De snelle vos springt over de luie hond",
          "Het weer is vandaag zonnig en warm",
          "Ik geniet van het lezen van boeken en het drinken van koffie",
        ],
        es: [
          "El rápido zorro salta sobre el perro perezoso",
          "El clima está soleado y cálido hoy",
          "Disfruto leer libros y beber café",
        ],
        de: [
          "Der schnelle Fuchs springt über den faulen Hund",
          "Das Wetter ist heute sonnig und warm",
          "Ich genieße das Lesen von Büchern und das Trinken von Kaffee",
        ],
      }

      for (const [expectedLang, texts] of Object.entries(languageSamples)) {
        for (const text of texts) {
          const result = preprocessText(text, "auto")
          expect(result.detectedLanguage).toBe(expectedLang)
          expect(result.preprocessingSteps).toContain(
            `Detected language: ${expectedLang}`,
          )
        }
      }
    })

    it("should handle mixed language text appropriately", () => {
      const mixedTexts = [
        "Hello bonjourHola",
        "The weather is muy bueno today",
        "Auto ist schnell and rápido",
      ]

      for (const text of mixedTexts) {
        const result = preprocessText(text, "auto")

        // Should detect one of the languages or unknown
        expect(["en", "nl", "es", "de", "unknown"]).toContain(
          result.detectedLanguage,
        )
        expect(
          result.preprocessingSteps.some(step =>
            step.includes("Detected language:"),
          ),
        ).toBe(true)
      }
    })
  })

  describe("Fallback Mechanism Quality", () => {
    it("should provide consistent fallback behavior", () => {
      const unsupportedLanguages = ["fr", "it", "pt", "sv", "no"]
      const testText = "Hello world"

      for (const lang of unsupportedLanguages) {
        const result = preprocessTextWithFallback(testText, lang as any)

        // Should fallback to English
        expect(result.detectedLanguage).toBe("en")
        expect(result.originalLanguage).toBe("en")
        expect(result.preprocessingSteps).toContain(
          "Using specified language: en",
        )
      }
    })

    it("should handle preprocessing errors gracefully", () => {
      // Test with very short text that should trigger length validation
      expect(() => {
        preprocessText("ab", "en", { minLength: 5 })
      }).toThrow("Text too short: minimum 5 characters required")

      // Test with very long text
      const longText = "a".repeat(1001)
      const result = preprocessText(longText, "en", { maxLength: 1000 })
      expect(result.processedText.length).toBe(1000)
      expect(result.preprocessingSteps).toContain(
        "Truncated to 1000 characters",
      )
    })
  })

  describe("Preprocessing Steps Quality", () => {
    it("should provide detailed and accurate preprocessing steps", () => {
      const text = "Can't you see the beautiful sunset?"
      const result = preprocessText(text, "en")

      expect(result.preprocessingSteps).toContain(
        "Using specified language: en",
      )
      expect(result.preprocessingSteps).toContain(
        "Applied en-specific patterns",
      )
      expect(result.preprocessingSteps).toContain("Removed special characters")
      expect(result.preprocessingSteps).toContain("Converted to lowercase")
      expect(result.preprocessingSteps).toContain("Normalized whitespace")
    })

    it("should handle different preprocessing options correctly", () => {
      const text = "The quick brown fox jumps over the lazy dog"

      // Test with stop words removal
      const resultWithStopWords = preprocessText(text, "en", {
        removeStopWords: true,
      })
      expect(resultWithStopWords.preprocessingSteps).toContain(
        "Removed stop words for en",
      )
      expect(resultWithStopWords.processedText).not.toContain("the")
      expect(resultWithStopWords.processedText).not.toContain("over")

      // Test without stop words removal
      const resultWithoutStopWords = preprocessText(text, "en", {
        removeStopWords: false,
      })
      expect(resultWithoutStopWords.preprocessingSteps).not.toContain(
        "Removed stop words for en",
      )
    })
  })

  describe("Cross-Language Consistency", () => {
    it("should maintain consistent preprocessing behavior for similar patterns", () => {
      const similarPatterns = [
        {
          en: "Hello, world!",
          nl: "Hallo, wereld!",
          es: "¡Hola, mundo!",
          de: "Hallo, Welt!",
        },
        {
          en: "How are you?",
          nl: "Hoe gaat het?",
          es: "¿Cómo estás?",
          de: "Wie geht es dir?",
        },
        {
          en: "Thank you very much",
          nl: "Hartelijk dank",
          es: "Muchas gracias",
          de: "Vielen Dank",
        },
      ]

      for (const pattern of similarPatterns) {
        const results: any[] = []

        for (const [lang, text] of Object.entries(pattern)) {
          const result = preprocessText(text, lang as SupportedLanguage)
          results.push(result)
        }

        // Verify all results have consistent preprocessing steps
        const commonSteps = [
          "Applied",
          "Removed special characters",
          "Converted to lowercase",
          "Normalized whitespace",
        ]

        results.forEach(result => {
          commonSteps.forEach(step => {
            const hasStep = result.preprocessingSteps.some((ps: string) =>
              ps.includes(step),
            )
            expect(hasStep).toBe(true)
          })
        })
      }
    })

    it("should handle numeric content consistently across languages", () => {
      const numericTexts = {
        en: "I have 2 cats and 3 dogs",
        nl: "Ik heb 2 katten en 3 honden",
        es: "Tengo 2 gatos y 3 perros",
        de: "Ich habe 2 Katzen und 3 Hunde",
      }

      for (const [lang, text] of Object.entries(numericTexts)) {
        const result = preprocessText(text, lang as SupportedLanguage)

        // Numbers should be preserved
        expect(result.processedText).toContain("2")
        expect(result.processedText).toContain("3")
        expect(result.detectedLanguage).toBe(lang)
      }
    })
  })
})
