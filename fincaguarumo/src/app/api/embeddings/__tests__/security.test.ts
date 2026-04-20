import { POST } from "../route"
import { NextRequest } from "next/server"

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

    // Reset rate limit map for each test
    const { rateLimitMap } = require("../route")
    if (rateLimitMap) {
      rateLimitMap.clear()
    }
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
      // Simulate exceeding rate limit by directly manipulating the rate limit map
      const { rateLimitMap } = require("../route")
      rateLimitMap.set("192.168.1.1", {
        count: 50, // At the limit
        resetTime: Date.now() + 60000,
      })

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
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    test("should allow admin action with valid admin token", async () => {
      process.env.ADMIN_TOKEN = "test-admin-token"

      // Re-import to get the updated environment variable
      const { POST: POSTWithToken } = await import("../route")

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

      // Ensure mocks are properly set for this test
      const {
        storeEmbedding: storeEmbeddingFresh,
        validateEmbedding: validateEmbeddingFresh,
      } = require("@/lib/semantic-rag/embeddings")
      storeEmbeddingFresh.mockResolvedValue(undefined)
      validateEmbeddingFresh.mockReturnValue(true)

      const response = await POSTWithToken(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test("should reject admin action with invalid admin token", async () => {
      process.env.ADMIN_TOKEN = "correct-token"

      const { POST: POSTWithToken } = await import("../route")

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

      const response = await POSTWithToken(request)
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
})
