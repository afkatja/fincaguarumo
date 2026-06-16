/**
 * @jest-environment node
 */

import { POST } from "../route"
import { NextRequest } from "next/server"

// Mock Redis to prevent authentication errors during testing
jest.mock("ioredis", () => {
  const mockRedis = {
    pipeline: jest.fn().mockReturnValue({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 0], // zcard result (no existing requests)
        [null, 1], // zadd result (1 new request added)
        [null, 1], // expire result
      ]),
    }),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue("PONG"),
  }
  return jest.fn(() => mockRedis)
})

// Mock the auth module
jest.mock("@/lib/auth", () => ({
  verifyAdminAuth: jest.fn().mockRejectedValue({
    message: "Missing or invalid authorization header",
    status: 401,
  }),
}))

// Mock the embeddings module
jest.mock("@/lib/semantic-rag/embeddings", () => ({
  generateEmbedding: jest.fn(),
  generateBatchEmbeddings: jest.fn(),
  storeEmbedding: jest.fn(),
  storeBatchEmbeddings: jest.fn(),
  embeddingExists: jest.fn(),
  validateEmbedding: jest.fn(),
  getEmbeddingDimensions: jest.fn(() => 384),
}))

const { verifyAdminAuth } = require("@/lib/auth")
const {
  generateEmbedding,
  storeEmbedding,
  embeddingExists,
  validateEmbedding,
} = require("@/lib/semantic-rag/embeddings")

describe("Embeddings API Security", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rate Limiting", () => {
    test("should allow requests within rate limit", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          text: "test text",
        }),
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      })

      generateEmbedding.mockResolvedValue([1, 2, 3])

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should rate limit excessive requests", async () => {
      // Mock Redis pipeline to simulate rate limit exceeded
      const RedisMock = jest.requireMock("ioredis")
      const mockRedis = RedisMock()

      const rateLimitPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore result
          [null, 50], // zcard result (50 existing requests - at limit)
          [null, 1], // zadd result (1 new request)
          [null, 1], // expire result
        ]),
      }

      mockRedis.pipeline.mockReturnValue(rateLimitPipeline)

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          text: "test text",
        }),
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.error).toBe("Too many requests. Please try again later.")

      // Reset the mock to default behavior for other tests
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore result
          [null, 0], // zcard result (no existing requests)
          [null, 1], // zadd result (1 new request added)
          [null, 1], // expire result
        ]),
      })
    })
  })

  describe("Admin Actions Security", () => {
    test("should reject store action without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "test-type",
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe("Missing or invalid authorization header")
    })

    test("should reject storeBatch action without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "storeBatch",
          embeddings: [
            {
              contentId: "test-id",
              contentType: "test-type",
              language: "en",
              content: "test content",
              embedding: new Array(384).fill(0.1),
            },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe("Missing or invalid authorization header")
    })

    test("should reject exists action without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "exists",
          contentId: "test-id",
          contentType: "test-type",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe("Missing or invalid authorization header")
    })
  })

  describe("Admin Token Authentication", () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    test("should allow admin action with valid admin token", async () => {
      process.env.ADMIN_TOKEN = "test-admin-token"

      // Override the default auth mock for this test
      const { verifyAdminAuth } = require("@/lib/auth")
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "test-type",
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
        headers: {
          "x-admin-token": "test-admin-token",
        },
      })

      storeEmbedding.mockResolvedValue(undefined)
      validateEmbedding.mockReturnValue(true)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test("should reject admin action with invalid admin token", async () => {
      process.env.ADMIN_TOKEN = "correct-token"

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "test-type",
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
        headers: {
          "x-admin-token": "wrong-token",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe("Safe Actions Public Access", () => {
    test("should allow generate action without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          text: "test text",
        }),
      })

      generateEmbedding.mockResolvedValue([1, 2, 3])

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should allow validate action without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "validate",
          embedding: new Array(384).fill(0.1),
        }),
      })

      validateEmbedding.mockReturnValue(true)

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.valid).toBe(true)
    })
  })

  describe("Supabase Auth Fallback", () => {
    test("should allow admin action with valid Supabase auth", async () => {
      // Override the default mock for this test
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "test-type",
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
        headers: {
          authorization: "Bearer valid-jwt-token",
        },
      })

      storeEmbedding.mockResolvedValue(undefined)
      validateEmbedding.mockReturnValue(true)

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
    })

    test("should reject admin action with invalid Supabase auth", async () => {
      verifyAdminAuth.mockRejectedValueOnce({
        message: "Invalid or expired token",
        status: 401,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "test-type",
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
        headers: {
          authorization: "Bearer invalid-jwt-token",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe("Content Type Validation", () => {
    test("should reject store action with invalid contentType", async () => {
      // Mock successful admin auth
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "malicious-type", // Invalid content type
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
        headers: {
          authorization: "Bearer valid-admin-token",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain("Invalid content type: malicious-type")
      expect(data.error).toContain("Allowed types:")
    })

    test("should allow store action with valid contentType", async () => {
      // Mock successful admin auth
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "store",
          contentId: "test-id",
          contentType: "faq", // Valid content type
          language: "en",
          content: "test content",
          embedding: new Array(384).fill(0.1),
        }),
        headers: {
          authorization: "Bearer valid-admin-token",
        },
      })

      storeEmbedding.mockResolvedValue(undefined)
      validateEmbedding.mockReturnValue(true)

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe("DoS Protection", () => {
    test("should reject requests with Content-Length exceeding limit", async () => {
      // Create a request with Content-Length header exceeding the 10MB limit
      const oversizedContent = "x".repeat(11 * 1024 * 1024) // 11MB of data

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: oversizedContent,
        headers: {
          "content-length": (11 * 1024 * 1024).toString(),
          "content-type": "application/json",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(413) // Request Entity Too Large

      const data = await response.json()
      expect(data.error).toContain("Request too large")
      expect(data.error).toContain("Maximum size is 10MB")
    })

    test("should reject requests with invalid Content-Length header", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: '{"action":"generate","text":"test"}',
        headers: {
          "content-length": "invalid-number",
          "content-type": "application/json",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(413)

      const data = await response.json()
      expect(data.error).toBe("Invalid Content-Length header")
    })

    test("should reject requests with negative Content-Length", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: '{"action":"generate","text":"test"}',
        headers: {
          "content-length": "-100",
          "content-type": "application/json",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(413)

      const data = await response.json()
      expect(data.error).toBe("Invalid Content-Length header")
    })

    test("should reject requests with actual body size exceeding limit", async () => {
      // Create a large JSON payload that exceeds the limit
      const largeTextArray = Array.from(
        { length: 100000 },
        (_, i) => `text ${i}: ${"x".repeat(100)}`,
      )
      const oversizedPayload = JSON.stringify({
        action: "generateBatch",
        texts: largeTextArray,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: oversizedPayload,
        headers: {
          "content-type": "application/json",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(413)

      const data = await response.json()
      expect(data.error).toContain("Request too large")
    })

    test("should reject generateBatch with too many items early", async () => {
      // Create a batch with more than MAX_BATCH_SIZE items
      const largeBatch = Array.from({ length: 150 }, (_, i) => `text ${i}`)

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "generateBatch",
          texts: largeBatch,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(413)

      const data = await response.json()
      expect(data.error).toContain("Batch too large")
      expect(data.error).toContain("Maximum size is 100 items")
    })

    test("should reject storeBatch with too many items early", async () => {
      // Mock successful admin auth
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      // Create a batch with more than MAX_BATCH_SIZE items using minimal structure
      const largeBatch = []
      for (let i = 0; i < 150; i++) {
        largeBatch.push({
          contentId: `id-${i}`,
          contentType: "faq",
          language: "en",
          content: `content ${i}`,
          embedding: [0.1, 0.2, 0.3], // Minimal embedding to avoid depth issues
        })
      }

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "storeBatch",
          embeddings: largeBatch,
        }),
        headers: {
          authorization: "Bearer valid-admin-token",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(413)

      const data = await response.json()
      expect(data.error).toContain("Batch too large")
      expect(data.error).toContain("Maximum size is 100 items")
    })

    test("should reject generateBatch with non-array texts", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "generateBatch",
          texts: "not an array",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Texts must be an array")
    })

    test("should reject storeBatch with non-array embeddings", async () => {
      // Mock successful admin auth
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "storeBatch",
          embeddings: "not an array",
        }),
        headers: {
          authorization: "Bearer valid-admin-token",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Embeddings must be an array")
    })

    test("should reject storeBatch with empty array", async () => {
      // Mock successful admin auth
      verifyAdminAuth.mockResolvedValueOnce({
        id: "admin-user-id",
        email: "admin@example.com",
        is_admin: true,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "storeBatch",
          embeddings: [],
        }),
        headers: {
          authorization: "Bearer valid-admin-token",
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Embeddings must be a non-empty array")
    })

    test("should allow requests within size limits", async () => {
      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
          text: "test text",
        }),
        headers: {
          "content-length": "100", // Well within limits
          "content-type": "application/json",
        },
      })

      generateEmbedding.mockResolvedValue([1, 2, 3])

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should prevent prototype pollution in JSON parsing", async () => {
      // Attempt to pollute prototype via JSON
      const maliciousPayload = JSON.stringify({
        action: "generate",
        text: "test",
        __proto__: { polluted: true },
        constructor: { prototype: { polluted: true } },
        prototype: { polluted: true },
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: maliciousPayload,
      })

      generateEmbedding.mockResolvedValue([1, 2, 3])

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify prototype wasn't polluted
      expect(({} as any).polluted).toBeUndefined()
      expect((Object.prototype as any).polluted).toBeUndefined()
    })

    test("should reject JSON with excessive nesting depth", async () => {
      // Create a deeply nested JSON object that exceeds MAX_JSON_DEPTH (10)
      let deepObject: { [key: string]: any } = { value: "deep" }
      for (let i = 0; i < 15; i++) {
        // Create 15 levels of nesting
        deepObject = { nested: deepObject }
      }

      const deepPayload = JSON.stringify({
        action: "generate",
        text: "test",
        data: deepObject,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: deepPayload,
      })

      const response = await POST(request)
      expect(response.status).toBe(413) // Request Entity Too Large for depth violations

      const data = await response.json()
      expect(data.error).toContain(
        "JSON depth exceeds maximum allowed depth of 10",
      )
    })

    test("should allow JSON within allowed depth limit", async () => {
      // Create a nested JSON object within MAX_JSON_DEPTH (10)
      let shallowObject: { [key: string]: any } = { value: "shallow" }
      for (let i = 0; i < 5; i++) {
        // Create only 5 levels of nesting
        shallowObject = { nested: shallowObject }
      }

      const shallowPayload = JSON.stringify({
        action: "generate",
        text: "test",
        data: shallowObject,
      })

      const request = new NextRequest("http://localhost:3000/api/embeddings", {
        method: "POST",
        body: shallowPayload,
      })

      generateEmbedding.mockResolvedValue([1, 2, 3])

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
