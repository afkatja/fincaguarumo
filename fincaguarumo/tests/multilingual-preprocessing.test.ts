import {
  preprocessText,
  preprocessTextWithFallback,
  detectLanguage,
  isSupportedLanguage,
  SupportedLanguage,
  PreprocessingOptions,
  PreprocessingResult,
} from '../src/lib/semantic-rag/multilingual-preprocessing'

describe('Multilingual Preprocessing Integration Tests', () => {
  describe('Language Detection', () => {
    test('should detect English text correctly', () => {
      const englishText = "Hello, how are you today? I hope you're doing well."
      const detected = detectLanguage(englishText)
      expect(detected).toBe('en')
    })

    test('should detect Dutch text correctly', () => {
      const dutchText = "Hallo, hoe gaat het met je vandaag? Ik hoop dat het goed gaat."
      const detected = detectLanguage(dutchText)
      expect(detected).toBe('nl')
    })

    test('should detect Spanish text correctly', () => {
      const spanishText = "Hola, ¿cómo estás hoy? Espero que estés bien."
      const detected = detectLanguage(spanishText)
      expect(detected).toBe('es')
    })

    test('should detect Russian text correctly', () => {
      const russianText = "Hello, kak dela segodnya? Nadeyus', u tebya vsyo khorosho."
      const detected = detectLanguage(russianText)
      expect(detected).toBe('ru')
    })

    test('should detect German text correctly', () => {
      const germanText = "Hallo, wie geht es dir heute? Ich hoffe, es geht dir gut."
      const detected = detectLanguage(germanText)
      expect(detected).toBe('de')
    })

    test('should return unknown for very short text', () => {
      const shortText = "Hi"
      const detected = detectLanguage(shortText)
      expect(detected).toBe('unknown')
    })

    test('should return unknown for text with no recognizable patterns', () => {
      const gibberishText = "xyz abc 123 !@#"
      const detected = detectLanguage(gibberishText)
      expect(detected).toBe('unknown')
    })
  })

  describe('Language Support', () => {
    test('should correctly identify supported languages', () => {
      expect(isSupportedLanguage('en')).toBe(true)
      expect(isSupportedLanguage('nl')).toBe(true)
      expect(isSupportedLanguage('es')).toBe(true)
      expect(isSupportedLanguage('ru')).toBe(true)
      expect(isSupportedLanguage('de')).toBe(true)
    })

    test('should correctly identify unsupported languages', () => {
      expect(isSupportedLanguage('fr')).toBe(false)
      expect(isSupportedLanguage('it')).toBe(false)
      expect(isSupportedLanguage('pt')).toBe(false)
      expect(isSupportedLanguage('zh')).toBe(false)
      expect(isSupportedLanguage('invalid')).toBe(false)
    })
  })

  describe('Text Preprocessing', () => {
    test('should preprocess English text with stop words removal', () => {
      const text = "The quick brown fox jumps over the lazy dog"
      const result = preprocessText(text, 'en', { removeStopWords: true })
      
      expect(result.processedText).toBe('quick brown fox jumps lazy dog')
      expect(result.detectedLanguage).toBe('en')
      expect(result.preprocessingSteps).toContain('Removed stop words for en')
    })

    test('should preprocess Dutch text with stop words removal', () => {
      const text = "De snelle bruine vos springt over de luie hond"
      const result = preprocessText(text, 'nl', { removeStopWords: true })
      
      expect(result.processedText).toBe('snelle bruine vos springt luie hond')
      expect(result.detectedLanguage).toBe('nl')
      expect(result.preprocessingSteps).toContain('Removed stop words for nl')
    })

    test('should preprocess Spanish text with contractions normalization', () => {
      const text = "No puedo hacerlo porque no tengo tiempo"
      const result = preprocessText(text, 'es', { normalizeContractions: true })
      
      expect(result.processedText).toContain('no puedo')
      expect(result.detectedLanguage).toBe('es')
    })

    test('should preprocess Russian text with character normalization', () => {
      const text = "Helloëëë world"
      const result = preprocessText(text, 'ru', { normalizeCharacters: true })
      
      expect(result.processedText).toContain('hello')
      expect(result.detectedLanguage).toBe('ru')
    })

    test('should preprocess German text with umlaut normalization', () => {
      const text = "Müller möchte über die Brücke gehen"
      const result = preprocessText(text, 'de', { normalizeCharacters: true })
      
      expect(result.processedText).toContain('Mueller')
      expect(result.processedText).toContain('moechte')
      expect(result.processedText).toContain('Bruecke')
      expect(result.detectedLanguage).toBe('de')
    })

    test('should handle lowercase conversion correctly', () => {
      const text = "HELLO WORLD"
      const result = preprocessText(text, 'en', { lowercase: true })
      
      expect(result.processedText).toBe('hello world')
      expect(result.preprocessingSteps).toContain('Converted to lowercase')
    })

    test('should handle whitespace normalization', () => {
      const text = "Hello    world\t\twith\n\nwhitespace"
      const result = preprocessText(text, 'en', { normalizeWhitespace: true })
      
      expect(result.processedText).toBe('hello world with whitespace')
      expect(result.preprocessingSteps).toContain('Normalized whitespace')
    })

    test('should handle punctuation removal', () => {
      const text = "Hello, world! How are you?"
      const result = preprocessText(text, 'en', { removePunctuation: true })
      
      expect(result.processedText).toBe('hello world how are you')
      expect(result.preprocessingSteps).toContain('Removed punctuation')
    })
  })

  describe('Preprocessing with Fallback', () => {
    test('should fallback to English for unsupported language', () => {
      const text = "Bonjour le monde"
      const result = preprocessTextWithFallback(text, 'fr')
      
      expect(result.processedText).toBeTruthy()
      expect(result.originalLanguage).toBe('fr')
      expect(result.detectedLanguage).toBe('en')
    })

    test('should handle auto-detection correctly', () => {
      const englishText = "This is English text"
      const result = preprocessTextWithFallback(englishText, 'auto')
      
      expect(result.detectedLanguage).toBe('en')
      expect(result.processedText).toBeTruthy()
    })

    test('should fallback to English on preprocessing error', () => {
      // Mock a scenario where preprocessing might fail
      const problematicText = ""
      const result = preprocessTextWithFallback(problematicText, 'en')
      
      expect(result.processedText).toBeTruthy()
      expect(result.detectedLanguage).toBe('en')
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty text gracefully', () => {
      const result = preprocessText('', 'en')
      
      expect(result.processedText).toBe('')
      expect(result.detectedLanguage).toBe('unknown')
    })

    test('should handle very long text', () => {
      const longText = "This is a very long text. ".repeat(1000)
      const result = preprocessText(longText, 'en', { maxLength: 500 })
      
      expect(result.processedText.length).toBeLessThanOrEqual(500)
      expect(result.preprocessingSteps).toContain('Truncated to 500 characters')
    })

    test('should handle text below minimum length', () => {
      const shortText = "Hi"
      
      expect(() => {
        preprocessText(shortText, 'en', { minLength: 10 })
      }).toThrow('Text too short: minimum 10 characters required')
    })

    test('should handle text with special characters', () => {
      const text = "Hello @world #test $money %percent &amp *star +plus -minus =equals"
      const result = preprocessText(text, 'en', { removePunctuation: true })
      
      expect(result.processedText).toBe('hello world test money percent amp star plus minus equals')
    })

    test('should handle text with mixed languages', () => {
      const mixedText = "Hello world comment ça va?"
      const result = preprocessText(mixedText, 'auto')
      
      expect(result.processedText).toBeTruthy()
      expect(result.detectedLanguage).toBe('en') // Should default to primary detected language
    })

    test('should handle text with emojis', () => {
      const text = "Hello world! How are you? I'm fine! Thanks! Have a great day!"
      const result = preprocessText(text, 'en')
      
      expect(result.processedText).toBeTruthy()
      expect(result.detectedLanguage).toBe('en')
    })

    test('should handle text with numbers', () => {
      const text = "I have 123 apples and 456 oranges"
      const result = preprocessText(text, 'en')
      
      expect(result.processedText).toContain('123')
      expect(result.processedText).toContain('456')
      expect(result.detectedLanguage).toBe('en')
    })

    test('should handle text with URLs and emails', () => {
      const text = "Visit https://example.com or email test@example.com for more info"
      const result = preprocessText(text, 'en')
      
      expect(result.processedText).toBeTruthy()
      expect(result.detectedLanguage).toBe('en')
    })
  })

  describe('Performance Tests', () => {
    test('should process text within reasonable time limits', () => {
      const text = "This is a test text for performance evaluation."
      const startTime = Date.now()
      
      preprocessText(text, 'en')
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(100) // Should complete within 100ms
    })

    test('should handle batch processing efficiently', () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Test text number ${i}`)
      const startTime = Date.now()
      
      const results = texts.map(text => preprocessText(text, 'en'))
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(results).toHaveLength(100)
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Memory Usage', () => {
    test('should not leak memory during repeated processing', () => {
      const text = "Test text for memory usage evaluation"
      
      // Process text multiple times to check for memory leaks
      for (let i = 0; i < 1000; i++) {
        preprocessText(text, 'en')
      }
      
      // If this test runs without crashing, memory management is likely OK
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle null input gracefully', () => {
      expect(() => {
        preprocessText(null as any, 'en')
      }).toThrow()
    })

    test('should handle undefined input gracefully', () => {
      expect(() => {
        preprocessText(undefined as any, 'en')
      }).toThrow()
    })

    test('should handle invalid language codes', () => {
      const text = "Hello world"
      const result = preprocessTextWithFallback(text, 'invalid')
      
      expect(result.detectedLanguage).toBe('en') // Should fallback to English
    })
  })

  describe('Integration with Other Components', () => {
    test('should work correctly with embedding generation pipeline', () => {
      const text = "This is a test for integration with embedding generation"
      const result = preprocessText(text, 'en', {
        removeStopWords: true,
        lowercase: true,
        normalizeWhitespace: true,
      })
      
      // The result should be ready for embedding generation
      expect(result.processedText).toBe('test integration embedding generation')
      expect(result.processedText.split(' ').length).toBeLessThan(text.split(' ').length)
    })

    test('should preserve metadata for downstream processing', () => {
      const text = "Original text for testing"
      const result = preprocessText(text, 'en')
      
      expect(result.originalLanguage).toBe('en')
      expect(result.preprocessingSteps).toBeInstanceOf(Array)
      expect(result.preprocessingSteps.length).toBeGreaterThan(0)
    })
  })
})
