/**
 * Input Validation Tests
 *
 * Comprehensive tests for input validation with length limits and sanitization
 */

import {
  validateInput,
  validateChatMessage,
  validateEmbeddingText,
  validateEmbeddingBatchText,
  validateContactForm,
  validateBookingForm,
  validateApiRequest,
  INPUT_LIMITS,
  ValidationResult,
  ApiValidationResult,
} from "../input-validation"

describe("Input Validation Utility", () => {
  describe("validateInput", () => {
    test("should accept valid string input", () => {
      const result = validateInput("Hello World", 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("Hello World")
    })

    test("should reject input that exceeds maximum length", () => {
      const longString = "a".repeat(101)
      const result = validateInput(longString, 100)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("exceeds maximum length")
    })

    test("should reject empty input when required", () => {
      const result = validateInput("", 100, { required: true })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be empty")
    })

    test("should accept empty input when not required", () => {
      const result = validateInput("", 100, { required: false })
      expect(result.isValid).toBe(true)
    })

    test("should sanitize malicious script tags", () => {
      const maliciousInput = '<script>alert("xss")</script>Hello'
      const result = validateInput(maliciousInput, 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("Hello")
    })

    test("should sanitize JavaScript protocols", () => {
      const maliciousInput = 'javascript:alert("xss")'
      const result = validateInput(maliciousInput, 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe('alert("xss")')
    })

    test("should sanitize SQL injection patterns", () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const result = validateInput(maliciousInput, 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("'; users; --")
    })

    test("should sanitize path traversal patterns", () => {
      const maliciousInput = "../../../etc/passwd"
      const result = validateInput(maliciousInput, 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("etc/passwd")
    })

    test("should validate email format", () => {
      const result = validateInput("test@example.com", 100, { format: "EMAIL" })
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("test@example.com")
    })

    test("should reject invalid email format", () => {
      const result = validateInput("invalid-email", 100, { format: "EMAIL" })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("format is invalid")
    })

    test("should validate phone format", () => {
      const result = validateInput("+1 (555) 123-4567", 50, { format: "PHONE" })
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("+1 (555) 123-4567")
    })

    test("should reject invalid phone format", () => {
      const result = validateInput("abc123", 50, { format: "PHONE" })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("format is invalid")
    })

    test("should normalize whitespace", () => {
      const result = validateInput("  Hello   World  ", 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("Hello World")
    })

    test("should remove control characters", () => {
      const result = validateInput("Hello\x00World\x1F", 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("HelloWorld")
    })

    test("should handle null and undefined input", () => {
      const nullResult = validateInput(null, 100, { required: false })
      expect(nullResult.isValid).toBe(true)

      const undefinedResult = validateInput(undefined, 100, { required: false })
      expect(undefinedResult.isValid).toBe(true)

      const nullRequiredResult = validateInput(null, 100, { required: true })
      expect(nullRequiredResult.isValid).toBe(false)
      expect(nullRequiredResult.error).toContain("required")
    })

    test("should convert non-string input to string", () => {
      const result = validateInput(123, 100)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("123")
    })
  })

  describe("validateChatMessage", () => {
    test("should accept valid chat message", () => {
      const result = validateChatMessage("Hello, I need help with booking")
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("Hello, I need help with booking")
    })

    test("should reject message that exceeds chat limit", () => {
      const longMessage = "a".repeat(INPUT_LIMITS.CHAT_MESSAGE + 1)
      const result = validateChatMessage(longMessage)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("exceeds maximum length")
    })

    test("should sanitize malicious content in chat message", () => {
      const maliciousMessage = '<script>alert("xss")</script>Help me book'
      const result = validateChatMessage(maliciousMessage)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("Help me book")
    })
  })

  describe("validateEmbeddingText", () => {
    test("should accept valid embedding text", () => {
      const result = validateEmbeddingText(
        "This is a sample text for embedding",
      )
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("This is a sample text for embedding")
    })

    test("should reject text that exceeds embedding limit", () => {
      const longText = "a".repeat(INPUT_LIMITS.EMBEDDING_TEXT + 1)
      const result = validateEmbeddingText(longText)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("exceeds maximum length")
    })
  })

  describe("validateEmbeddingBatchText", () => {
    test("should accept valid batch of texts", () => {
      const texts = ["Text 1", "Text 2", "Text 3"]
      const result = validateEmbeddingBatchText(texts)
      expect(result.isValid).toBe(true)
    })

    test("should reject non-array input", () => {
      const result = validateEmbeddingBatchText("not an array" as any)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("must be an array")
    })

    test("should reject empty array", () => {
      const result = validateEmbeddingBatchText([])
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot be empty")
    })

    test("should reject batch that exceeds size limit", () => {
      const texts = Array(101).fill("Text")
      const result = validateEmbeddingBatchText(texts)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("cannot exceed 100 items")
    })

    test("should reject individual texts that exceed limit", () => {
      const texts = [
        "Valid text",
        "a".repeat(INPUT_LIMITS.EMBEDDING_BATCH_TEXT + 1),
      ]
      const result = validateEmbeddingBatchText(texts)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Batch text 2")
    })

    test("should sanitize malicious content in batch texts", () => {
      const texts = [
        "Valid text",
        '<script>alert("xss")</script>Malicious text',
      ]
      const result = validateEmbeddingBatchText(texts)
      expect(result.isValid).toBe(true)
    })
  })

  describe("validateContactForm", () => {
    test("should accept valid contact form data", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        message: "I would like to inquire about booking",
      }
      const result = validateContactForm(data)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toEqual({
        name: "John Doe",
        email: "john@example.com",
        message: "I would like to inquire about booking",
      })
    })

    test("should reject invalid email format", () => {
      const data = {
        name: "John Doe",
        email: "invalid-email",
        message: "Test message",
      }
      const result = validateContactForm(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Email")
    })

    test("should reject name that exceeds limit", () => {
      const data = {
        name: "a".repeat(INPUT_LIMITS.CONTACT_NAME + 1),
        email: "test@example.com",
        message: "Test message",
      }
      const result = validateContactForm(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Name")
    })

    test("should reject message that exceeds limit", () => {
      const data = {
        name: "John Doe",
        email: "test@example.com",
        message: "a".repeat(INPUT_LIMITS.CONTACT_MESSAGE + 1),
      }
      const result = validateContactForm(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Message")
    })

    test("should sanitize malicious content in contact form", () => {
      const data = {
        name: '<script>alert("xss")</script>John',
        email: "test@example.com",
        message: "This message contains <b>HTML</b> tags",
      }
      const result = validateContactForm(data)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue?.name).toBe("John")
      expect(result.sanitizedValue?.message).toBe(
        "This message contains HTML tags",
      )
    })
  })

  describe("validateBookingForm", () => {
    test("should accept valid booking form data", () => {
      const data = {
        guestName: "Jane Smith",
        email: "jane@example.com",
        phone: "+1 (555) 123-4567",
        source: "Direct",
        bookingType: "villa",
        uid: "user123",
      }
      const result = validateBookingForm(data)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toEqual({
        guestName: "Jane Smith",
        email: "jane@example.com",
        phone: "+1 (555) 123-4567",
        source: "Direct",
        bookingType: "villa",
        uid: "user123",
      })
    })

    test("should accept optional fields as undefined", () => {
      const data = {
        guestName: "Jane Smith",
        uid: "user123",
      }
      const result = validateBookingForm(data)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue?.guestName).toBe("Jane Smith")
      expect(result.sanitizedValue?.uid).toBe("user123")
    })

    test("should reject invalid phone format", () => {
      const data = {
        guestName: "Jane Smith",
        phone: "invalid-phone",
        uid: "user123",
      }
      const result = validateBookingForm(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Phone")
    })

    test("should reject guest name that exceeds limit", () => {
      const data = {
        guestName: "a".repeat(INPUT_LIMITS.BOOKING_GUEST_NAME + 1),
        uid: "user123",
      }
      const result = validateBookingForm(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Guest name")
    })
  })

  describe("validateApiRequest", () => {
    test("should validate API request with multiple fields", () => {
      const requestBody = {
        contentId: "doc123",
        contentType: "article",
        language: "en",
        content: "This is the content",
      }
      const rules = {
        contentId: { maxLength: 100, required: true, sanitize: true },
        contentType: { maxLength: 50, required: true, sanitize: true },
        language: { maxLength: 10, required: true, sanitize: true },
        content: { maxLength: 1000, required: true, sanitize: true },
      }
      const result = validateApiRequest(requestBody, rules)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toEqual(requestBody)
    })

    test("should reject API request with missing required fields", () => {
      const requestBody = {
        contentId: "doc123",
        // Missing contentType, language, content
      }
      const rules = {
        contentId: { maxLength: 100, required: true, sanitize: true },
        contentType: { maxLength: 50, required: true, sanitize: true },
        language: { maxLength: 10, required: true, sanitize: true },
        content: { maxLength: 1000, required: true, sanitize: true },
      }
      const result = validateApiRequest(requestBody, rules)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("contentType")
      expect(result.error).toContain("language")
      expect(result.error).toContain("content")
    })

    test("should sanitize malicious content in API request", () => {
      const requestBody = {
        contentId: '<script>alert("xss")</script>doc123',
        contentType: "article",
        language: "en",
        content: "Content with <b>HTML</b> tags",
      }
      const rules = {
        contentId: { maxLength: 100, required: true, sanitize: true },
        contentType: { maxLength: 50, required: true, sanitize: true },
        language: { maxLength: 10, required: true, sanitize: true },
        content: { maxLength: 1000, required: true, sanitize: true },
      }
      const result = validateApiRequest(requestBody, rules)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue?.contentId).toBe("doc123")
      expect(result.sanitizedValue?.content).toBe("Content with HTML tags")
    })

    test("should handle optional fields", () => {
      const requestBody = {
        contentId: "doc123",
        contentType: "article",
        // language and content are optional
      }
      const rules = {
        contentId: { maxLength: 100, required: true, sanitize: true },
        contentType: { maxLength: 50, required: true, sanitize: true },
        language: { maxLength: 10, required: false, sanitize: true },
        content: { maxLength: 1000, required: false, sanitize: true },
      }
      const result = validateApiRequest(requestBody, rules)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toEqual({
        contentId: "doc123",
        contentType: "article",
      })
    })

    describe("Security Tests", () => {
      test("should prevent XSS attacks", () => {
        const xssPayloads = [
          '<script>alert("xss")</script>',
          '<img src="x" onerror="alert(1)">',
          '<iframe src="javascript:alert(1)"></iframe>',
          "javascript:alert(1)",
          "data:text/html,<script>alert(1)</script>",
          'vbscript:msgbox("xss")',
        ]

        xssPayloads.forEach(payload => {
          const result = validateInput(payload, 1000)
          // Some payloads might become empty after sanitization, which is valid
          if (result.sanitizedValue === "") {
            expect(result.isValid).toBe(true)
          } else {
            expect(result.isValid).toBe(true)
            expect(result.sanitizedValue).not.toContain("<script")
            expect(result.sanitizedValue).not.toContain("javascript:")
            expect(result.sanitizedValue).not.toContain("vbscript:")
          }
        })
      })

      test("should prevent SQL injection attacks", () => {
        const sqlPayloads = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          '" OR "1"="1',
          "1; DELETE FROM users WHERE 1=1; --",
          "UNION SELECT * FROM passwords",
        ]

        sqlPayloads.forEach(payload => {
          const result = validateInput(payload, 1000)
          expect(result.isValid).toBe(true)
          expect(result.sanitizedValue).not.toContain("DROP TABLE")
          expect(result.sanitizedValue).not.toContain("DELETE FROM")
          expect(result.sanitizedValue).not.toContain("UNION SELECT")
        })
      })

      test("should prevent path traversal attacks", () => {
        const pathPayloads = [
          "../../../etc/passwd",
          "..\\..\\..\\windows\\system32\\config\\sam",
          "....//....//....//etc/passwd",
          "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        ]

        pathPayloads.forEach(payload => {
          const result = validateInput(payload, 1000)
          expect(result.isValid).toBe(true)
          expect(result.sanitizedValue).not.toContain("../")
          expect(result.sanitizedValue).not.toContain("..\\")
        })
      })

      test("should prevent null byte injection", () => {
        const nullPayloads = [
          "test\x00file",
          "image.png\x00.php",
          "document.pdf\x00\x00.exe",
        ]

        nullPayloads.forEach(payload => {
          const result = validateInput(payload, 1000)
          expect(result.isValid).toBe(true)
          expect(result.sanitizedValue).not.toContain("\x00")
        })
      })

      test("should prevent control character injection", () => {
        const controlPayloads = [
          "test\x01\x02\x03",
          "content\x0b\x0c\x0e",
          "data\x1f\x7f",
        ]

        controlPayloads.forEach(payload => {
          const result = validateInput(payload, 1000)
          expect(result.isValid).toBe(true)
          expect(result.sanitizedValue).not.toContain("\x01")
          expect(result.sanitizedValue).not.toContain("\x1f")
          expect(result.sanitizedValue).not.toContain("\x7f")
        })
      })
    }) // Added closing bracket here

    describe("Edge Cases", () => {
      test("should handle extremely long inputs", () => {
        const extremelyLong = "a".repeat(100000)
        const result = validateInput(extremelyLong, 1000)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain("exceeds maximum length")
      })

      test("should handle Unicode characters", () => {
        const unicodeText = "Hello ð ð ð"
        const result = validateInput(unicodeText, 100)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedValue).toBe(unicodeText)
      })

      test("should handle mixed content types", () => {
        const mixedInput = 12345
        const result = validateInput(mixedInput, 100)
        expect(result.isValid).toBe(true)
        expect(result.sanitizedValue).toBe("12345")
      })

      test("should handle empty strings with whitespace", () => {
        const whitespaceInput = "   \t\n\r   "
        const result = validateInput(whitespaceInput, 100)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain("cannot be empty")
      })

      test("should handle malicious content that becomes empty after sanitization", () => {
        const maliciousOnly = '<script>alert("xss")</script>'
        const result = validateInput(maliciousOnly, 100)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain("invalid characters or content")
      })
    })
  })
})
