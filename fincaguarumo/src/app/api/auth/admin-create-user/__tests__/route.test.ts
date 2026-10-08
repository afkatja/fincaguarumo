// API Route Tests for Admin Create User Endpoint
// Tests for authentication, rate limiting, user creation, and error scenarios

// Mock dependencies BEFORE importing the route
jest.mock("@/lib/auth")

import { POST, rateLimitMap } from "../route"
import { createSupabaseAdmin } from "@/lib/auth"

const mockCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock

interface MockSupabase {
  auth: {
    admin: {
      createUser: jest.Mock
      generateLink: jest.Mock
    }
  }
}

describe("POST /api/auth/admin-create-user", () => {
  let mockSupabase: MockSupabase

  beforeEach(() => {
    jest.clearAllMocks()

    // Clear rate limit map
    rateLimitMap.clear()

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        admin: {
          createUser: jest.fn(),
          generateLink: jest.fn(),
        },
      },
    }
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase)

    // Set required env var
    process.env.ADMIN_SIGNUP_SECRET = "test-secret-123"
  })

  afterEach(() => {
    delete process.env.ADMIN_SIGNUP_SECRET
  })

  describe("Authentication", () => {
    test("should return 401 when X-Admin-Signup-Secret header is missing", async () => {
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    test("should return 401 when X-Admin-Signup-Secret header is incorrect", async () => {
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "wrong-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    test("should return 500 when ADMIN_SIGNUP_SECRET env var is not set", async () => {
      delete process.env.ADMIN_SIGNUP_SECRET

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Server misconfigured")
    })

    test("should proceed when X-Admin-Signup-Secret header is correct", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(500)
    })
  })

  describe("Rate Limiting", () => {
    test("should allow requests within rate limit", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const headers = {
        "X-Admin-Signup-Secret": "test-secret-123",
        "X-Forwarded-For": "192.168.1.1",
      }

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const request = new Request(
          "http://localhost/api/auth/admin-create-user",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              email: `test${i}@example.com`,
              password: "password123",
            }),
          },
        )

        const response = await POST(request)
        expect(response.status).not.toBe(429)
      }
    })

    test("should return 429 when rate limit is exceeded", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const headers = {
        "X-Admin-Signup-Secret": "test-secret-123",
        "X-Forwarded-For": "192.168.1.2",
      }

      // Make 6 requests (exceeds limit of 5)
      let lastResponse
      for (let i = 0; i < 6; i++) {
        const request = new Request(
          "http://localhost/api/auth/admin-create-user",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              email: `test${i}@example.com`,
              password: "password123",
            }),
          },
        )

        lastResponse = await POST(request)
      }

      expect(lastResponse?.status).toBe(429)
      const data = await lastResponse?.json()
      expect(data?.error).toBe("Too many requests. Please try again later.")
    })

    test("should rate limit per IP address", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      // IP 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        const request = new Request(
          "http://localhost/api/auth/admin-create-user",
          {
            method: "POST",
            headers: {
              "X-Admin-Signup-Secret": "test-secret-123",
              "X-Forwarded-For": "192.168.1.3",
            },
            body: JSON.stringify({
              email: `test1-${i}@example.com`,
              password: "password123",
            }),
          },
        )

        const response = await POST(request)
        expect(response.status).not.toBe(429)
      }

      // IP 2 should still be able to make requests
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
            "X-Forwarded-For": "192.168.1.4",
          },
          body: JSON.stringify({
            email: "test2@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      expect(response.status).not.toBe(429)
    })
  })

  describe("Request Validation", () => {
    test("should return 400 when email is missing", async () => {
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Email and password are required")
    })

    test("should return 400 when password is missing", async () => {
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Email and password are required")
    })

    test("should return 400 when both email and password are missing", async () => {
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({}),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Email and password are required")
    })
  })

  describe("User Creation", () => {
    test("should create user with correct parameters", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
            data: { role: "admin" },
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        email_confirm: false,
        user_metadata: { role: "admin" },
      })
      expect(data.user).toBeDefined()
      expect(data.message).toContain("Confirmation email will be sent")
    })

    test("should return 409 when user already exists", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
          status: 409,
        },
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "existing@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain("already been registered")
    })

    test("should handle Supabase errors gracefully", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: {
          message: "Some other error",
          status: 400,
        },
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    test("should generate confirmation link when emailRedirectTo is provided", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: { id: "user-123", email: "test@example.com" },
        },
        error: null,
      })

      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
            emailRedirectTo: "https://example.com/redirect",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
        password: "password123",
        options: {
          redirectTo: "https://example.com/redirect",
        },
      })
    })

    test("should handle generateLink errors gracefully", async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: { id: "user-123", email: "test@example.com" },
        },
        error: null,
      })

      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: "Generate link failed" },
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
            emailRedirectTo: "https://example.com/redirect",
          }),
        },
      )

      const response = await POST(request)
      // Should still succeed even if generateLink fails
      expect(response.status).toBe(200)
    })
  })

  describe("Error Handling", () => {
    test("should return 500 on unexpected errors", async () => {
      mockSupabase.auth.admin.createUser.mockImplementation(() => {
        throw new Error("Unexpected error")
      })

      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Internal server error")
    })

    test("should handle invalid JSON in request body", async () => {
      const request = new Request(
        "http://localhost/api/auth/admin-create-user",
        {
          method: "POST",
          headers: {
            "X-Admin-Signup-Secret": "test-secret-123",
            "Content-Type": "application/json",
          },
          body: "invalid json",
        },
      )

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })
})
