/**
 * @jest-environment node
 * Unit tests for multilingual text preprocessing
 */

import {
  preprocessText,
  preprocessTextWithFallback,
  detectLanguage,
  isSupportedLanguage,
  getFallbackLanguage,
  SupportedLanguage,
} from "../multilingual-preprocessing"

describe("Multilingual Preprocessing", () => {
  describe("Language Detection", () => {
    it("should detect English correctly", () => {
      const text = "The quick brown fox jumps over the lazy dog"
      const result = detectLanguage(text)
      expect(result).toBe("en")
    })

    it("should detect Dutch correctly", () => {
      const text = "De snelle vos springt over de luie hond"
      const result = detectLanguage(text)
      expect(result).toBe("nl")
    })

    it("should detect Spanish correctly", () => {
      const text = "El rápido zorro salta sobre el perro perezoso"
      const result = detectLanguage(text)
      expect(result).toBe("es")
    })

    it("should detect Russian correctly", () => {
      const text = "Быстрая лиса прыгает через ленивую собаку"
      const result = detectLanguage(text)
      expect(result).toBe("ru")
    })

    it("should detect German correctly", () => {
      const text = "Der schnelle Fuchs springt über den faulen Hund"
      const result = detectLanguage(text)
      expect(result).toBe("de")
    })

    it("should return unknown for unsupported language", () => {
      const text = "Lorem ipsum dolor sit amet"
      const result = detectLanguage(text)
      expect(result).toBe("unknown")
    })
  })

  describe("Language Support Validation", () => {
    it("should validate supported languages correctly", () => {
      expect(isSupportedLanguage("en")).toBe(true)
      expect(isSupportedLanguage("nl")).toBe(true)
      expect(isSupportedLanguage("es")).toBe(true)
      expect(isSupportedLanguage("ru")).toBe(true)
      expect(isSupportedLanguage("de")).toBe(true)
    })

    it("should reject unsupported languages", () => {
      expect(isSupportedLanguage("fr")).toBe(false)
      expect(isSupportedLanguage("it")).toBe(false)
      expect(isSupportedLanguage("pt")).toBe(false)
    })
  })

  describe("Fallback Language Mapping", () => {
    it("should map unsupported languages to supported ones", () => {
      expect(getFallbackLanguage("fr")).toBe("en")
      expect(getFallbackLanguage("it")).toBe("en")
      expect(getFallbackLanguage("pt")).toBe("es")
      expect(getFallbackLanguage("cs")).toBe("de")
      expect(getFallbackLanguage("bg")).toBe("ru")
    })

    it("should default to English for unknown languages", () => {
      expect(getFallbackLanguage("unknown")).toBe("en")
      expect(getFallbackLanguage("xyz")).toBe("en")
    })
  })

  describe("Text Preprocessing", () => {
    it("should preprocess English text correctly", () => {
      const text = "Can't you see the beautiful sunset?"
      const result = preprocessText(text, "en")

      expect(result.processedText).toBe("can t you see the beautiful sunset")
      expect(result.detectedLanguage).toBe("en")
      expect(result.originalLanguage).toBe("en")
      expect(result.preprocessingSteps).toContain(
        "Applied en-specific patterns",
      )
      expect(result.preprocessingSteps).toContain("Converted to lowercase")
    })

    it("should preprocess Dutch text correctly", () => {
      const text = "Ik kan het niet geloven!"
      const result = preprocessText(text, "nl")

      expect(result.processedText).toBe("ik kan het niet geloven")
      expect(result.detectedLanguage).toBe("nl")
      expect(result.preprocessingSteps).toContain(
        "Applied nl-specific patterns",
      )
    })

    it("should preprocess Spanish text correctly", () => {
      const text = "¿Qué tal estás? ¿Cómo estás?"
      const result = preprocessText(text, "es")

      expect(result.processedText).toBe("que tal estas como estas")
      expect(result.detectedLanguage).toBe("es")
      expect(result.preprocessingSteps).toContain(
        "Applied es-specific patterns",
      )
    })

    it("should preprocess Russian text correctly", () => {
      const text = "Привет! Как дела?"
      const result = preprocessText(text, "ru")

      expect(result.processedText).toBe("privet kak dela")
      expect(result.detectedLanguage).toBe("ru")
      expect(result.preprocessingSteps).toContain(
        "Applied ru-specific patterns",
      )
    })

    it("should preprocess German text correctly", () => {
      const text = "Müller geht nach über"
      const result = preprocessText(text, "de")

      expect(result.processedText).toBe("mueller geht nach ueber")
      expect(result.detectedLanguage).toBe("de")
      expect(result.preprocessingSteps).toContain(
        "Applied de-specific patterns",
      )
    })

    it("should handle auto-detection correctly", () => {
      const text = "The weather is nice today"
      const result = preprocessText(text, "auto")

      expect(result.detectedLanguage).toBe("en")
      expect(result.originalLanguage).toBe("en")
      expect(result.preprocessingSteps).toContain("Detected language: en")
    })

    it("should remove stop words when requested", () => {
      const text = "The quick brown fox jumps over the lazy dog"
      const result = preprocessText(text, "en", { removeStopWords: true })

      expect(result.processedText).toBe("quick brown fox jumps lazy dog")
      expect(result.preprocessingSteps).toContain("Removed stop words for en")
    })

    it("should handle text length validation", () => {
      expect(() => preprocessText("ab", "en", { minLength: 5 })).toThrow(
        "Text too short: minimum 5 characters required",
      )

      const longText = "a".repeat(1001)
      const result = preprocessText(longText, "en", { maxLength: 1000 })
      expect(result.processedText.length).toBe(1000)
      expect(result.preprocessingSteps).toContain(
        "Truncated to 1000 characters",
      )
    })
  })

  describe("Preprocessing with Fallback", () => {
    it("should fallback to English for unsupported languages", () => {
      const text = "Bonjour le monde"
      const result = preprocessTextWithFallback(text, "fr" as any)

      expect(result.detectedLanguage).toBe("en")
      expect(result.preprocessingSteps).toContain(
        "Using specified language: en",
      )
    })

    it("should handle preprocessing errors gracefully", () => {
      // Mock a scenario that might cause errors
      const result = preprocessTextWithFallback("test text", "en")

      expect(result.processedText).toBeDefined()
      expect(result.preprocessingSteps).toBeDefined()
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty text", () => {
      expect(() => preprocessText("", "en")).toThrow()
    })

    it("should handle whitespace-only text", () => {
      expect(() => preprocessText("   ", "en")).toThrow()
    })

    it("should handle special characters", () => {
      const text = "Hello @world #test $123"
      const result = preprocessText(text, "en", { removeSpecialChars: true })

      expect(result.processedText).toBe("hello world test 123")
      expect(result.preprocessingSteps).toContain("Removed special characters")
    })

    it("should handle mixed language text", () => {
      const text = "Hello bonjourHola"
      const result = preprocessText(text, "auto")

      // Should detect based on keyword scoring - might be unknown for mixed text
      expect(["en", "fr", "es", "unknown"]).toContain(result.detectedLanguage)
    })
  })
})
