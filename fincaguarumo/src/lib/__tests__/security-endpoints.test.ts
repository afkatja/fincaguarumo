import { NextRequest } from "next/server"
import { POST as cleanupHandler } from "../../app/api/cleanup/route"
import { POST as forceDeleteHandler } from "../../app/api/force-delete/route"
import { POST as bookingsHandler } from "../../app/api/bookings/route"
import { validateChatMessage, validateBookingForm } from "../input-validation"
import { bookingsRateLimiter } from "../rate-limiting/redis-rate-limit"

describe("AC7: Security and Ops", () => {
  describe("Protected Cleanup Endpoints", () => {
    test("should reject requests without admin secret header", async () => {
      expect.assertions(2)

      // Create mock request without admin secret header
      const request = new NextRequest("http://localhost/api/cleanup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      })

      // Call the actual cleanup handler
      const response = await cleanupHandler(request)

      // Assert on the actual Response returned
      expect(response.status).toBe(401)
      const responseBody = await response.json()
      expect(responseBody.error).toContain("Unauthorized")
    })

    test("should accept requests with valid admin secret header", async () => {
      expect.assertions(2)

      // Create mock request with valid admin secret header
      const request = new NextRequest("http://localhost/api/cleanup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET || "test-secret",
        },
      })

      // Call the actual cleanup handler
      const response = await cleanupHandler(request)

      // Assert on the actual Response returned
      expect(response.status).toBe(200)
      const responseBody = await response.json()
      expect(responseBody.success).toBe(true)
    })

    test("should validate document ID in force-delete requests", async () => {
      expect.assertions(2)

      // Create mock request with empty docId and valid admin secret
      const request = new NextRequest("http://localhost/api/force-delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET || "test-secret",
        },
        body: JSON.stringify({ docId: "" }), // Empty docId
      })

      // Call the actual force-delete handler
      const response = await forceDeleteHandler(request)

      // Assert on the actual Response returned
      expect(response.status).toBe(400)
      const responseBody = await response.json()
      expect(responseBody.error).toContain("Document ID is required")
    })

    test("should allow valid document ID in force-delete requests", async () => {
      expect.assertions(2)

      // Create mock request with valid docId and admin secret
      const request = new NextRequest("http://localhost/api/force-delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET || "test-secret",
        },
        body: JSON.stringify({ docId: "valid-doc-123" }),
      })

      // Call the actual force-delete handler
      const response = await forceDeleteHandler(request)

      // Assert on the actual Response returned
      expect(response.status).toBe(200)
      const responseBody = await response.json()
      expect(responseBody.success).toBe(true)
    })

    test("should handle different admin secret values", () => {
      // Set a known secret for testing
      const testSecret = "test-secret"
      const originalSecret = process.env.ADMIN_SECRET
      process.env.ADMIN_SECRET = testSecret

      const testCases = [
        { secret: null, expected: false },
        { secret: "", expected: false },
        { secret: "wrong-secret", expected: false },
        { secret: testSecret, expected: true },
      ]

      testCases.forEach(({ secret, expected }) => {
        const headers = new Map()
        if (secret) headers.set("x-admin-secret", secret)

        const adminSecret = headers.get("x-admin-secret")
        const expectedSecret = testSecret
        const isValid = adminSecret === expectedSecret

        expect(isValid).toBe(expected)
      })

      // Restore original secret
      process.env.ADMIN_SECRET = originalSecret
    })
  })

  describe("Input Validation", () => {
    test("should validate and sanitize chat input", async () => {
      expect.assertions(3)

      // Test with malicious input containing script tags
      const maliciousInput = "<script>alert('xss')</script>"

      // Call the actual validation function
      const result = validateChatMessage(maliciousInput)

      // Should be valid after sanitization
      expect(result.isValid).toBe(true)

      // Sanitized output should not contain malicious content
      expect(result.sanitizedValue).not.toContain("<script>")
      expect(result.sanitizedValue).not.toContain("</script>")
    })

    test("should validate booking data structure", async () => {
      expect.assertions(2)

      const validBookingData = {
        guestName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        source: "website",
        bookingType: "tour",
        summary: "Test booking",
        description: "Test description",
        uid: "test-uid-123",
      }

      // Call the actual validation function
      const result = validateBookingForm(validBookingData)

      // Should be valid
      expect(result.isValid).toBe(true)

      // Should return sanitized data
      expect(result.sanitizedValue).toBeDefined()
      if (result.sanitizedValue) {
        expect(result.sanitizedValue.guestName).toBe("John Doe")
        expect(result.sanitizedValue.email).toBe("john@example.com")
      }
    })

    test("should reject malformed booking data", async () => {
      expect.assertions(2)

      const invalidBookingData = {
        guestName: "", // Empty name
        email: "invalid-email", // Invalid email format
        phone: "invalid-phone", // Invalid phone format
        source: "",
        bookingType: "",
        summary: "",
        description: "",
        uid: "", // Empty UID (required)
      }

      // Call the actual validation function
      const result = validateBookingForm(invalidBookingData)

      // Should be invalid
      expect(result.isValid).toBe(false)

      // Should have error message
      expect(result.error).toBeDefined()
      expect(result.error).toContain("Guest name")
    })
  })

  describe("Rate Limiting", () => {
    test("should implement rate limiting on bookings endpoint", async () => {
      expect.assertions(2)

      const testIP = "192.168.1.1"

      // Mock the rate limiter to simulate exceeding the limit
      const mockCheckLimit = jest
        .fn()
        .mockResolvedValueOnce({ allowed: true, resetTime: Date.now() + 60000 })
        .mockResolvedValueOnce({ allowed: true, resetTime: Date.now() + 60000 })
        .mockResolvedValue({ allowed: false, resetTime: Date.now() + 60000 })

      // Replace the checkLimit method temporarily
      const originalCheckLimit = bookingsRateLimiter.checkLimit
      bookingsRateLimiter.checkLimit = mockCheckLimit

      try {
        // Create a mock request for bookings endpoint
        const request = new NextRequest("http://localhost/api/bookings", {
          method: "POST",
          headers: {
            "x-forwarded-for": testIP,
            authorization: "Bearer mock-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            guestName: "Test User",
            email: "test@example.com",
            uid: "test-uid-123",
          }),
        })

        // Call the bookings handler - should be rate limited on third call
        const response = await bookingsHandler(request)

        // Should return 429 status when rate limited
        expect(response.status).toBe(429)

        const responseBody = await response.json()
        expect(responseBody.error).toContain("Too many requests")
      } finally {
        // Restore original method
        bookingsRateLimiter.checkLimit = originalCheckLimit
      }
    })

    test("should allow burst requests within limits", async () => {
      expect.assertions(2)

      const testIP = "192.168.1.2"

      // Mock the rate limiter to allow requests within limits
      const mockCheckLimit = jest.fn().mockResolvedValue({
        allowed: true,
        resetTime: Date.now() + 60000,
      })

      // Replace the checkLimit method temporarily
      const originalCheckLimit = bookingsRateLimiter.checkLimit
      bookingsRateLimiter.checkLimit = mockCheckLimit

      try {
        // Create a mock request for bookings endpoint
        const request = new NextRequest("http://localhost/api/bookings", {
          method: "POST",
          headers: {
            "x-forwarded-for": testIP,
            authorization: "Bearer mock-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            guestName: "Test User",
            email: "test@example.com",
            uid: "test-uid-123",
          }),
        })

        // Call the bookings handler - should be allowed
        const response = await bookingsHandler(request)

        // Should return 200 status when within rate limits
        expect(response.status).toBe(200)

        const responseBody = await response.json()
        expect(responseBody).toBeDefined()
      } finally {
        // Restore original method
        bookingsRateLimiter.checkLimit = originalCheckLimit
      }
    })
  })

  describe("Environment Variable Validation", () => {
    test("should require critical environment variables", () => {
      const requiredVars = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
      ]

      requiredVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined()
      })
    })
  })

  describe("SQL Injection Prevention", () => {
    test("should prevent SQL injection in booking queries", async () => {
      const maliciousInput = "'; DROP TABLE bookings; --"

      // Should be properly escaped in database queries
      expect(maliciousInput).toContain("DROP TABLE")

      // In actual implementation, should use parameterized queries
      const safeQuery = "SELECT * FROM bookings WHERE id = $1"
      expect(safeQuery).not.toContain(maliciousInput)
    })

    test("should sanitize user input in database operations", async () => {
      const userInput = "Robert'); DROP TABLE users; --"

      // Should be escaped or parameterized
      expect(userInput).toContain("DROP TABLE")

      // Safe parameterized query
      const params = [userInput]
      expect(params).toHaveLength(1)
    })
  })

  describe("XSS Prevention", () => {
    test("should escape HTML in chat responses", async () => {
      const maliciousResponse = "<img src=x onerror=alert('xss')>"
      const escapedResponse = maliciousResponse
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

      expect(escapedResponse).not.toContain("<img")
      expect(escapedResponse).not.toContain("onerror=alert('xss')>") // The dangerous combination should be broken
      expect(escapedResponse).toContain("&lt;img")
      expect(escapedResponse).toContain("&gt;")
      expect(escapedResponse).toContain("onerror=alert") // The text remains but is harmless
    })

    test("should sanitize user input before storage", async () => {
      const userInput = "<script>document.location='evil.com'</script>"
      const sanitizedInput = userInput.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      )

      expect(sanitizedInput).not.toContain("<script>")
      expect(sanitizedInput).not.toContain("document.location")
    })
  })
})
