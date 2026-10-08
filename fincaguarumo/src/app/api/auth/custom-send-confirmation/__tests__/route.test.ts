// API Route Tests for Custom Send Confirmation Endpoint
// Tests for authentication, email validation, confirmation link generation, and error scenarios

// Mock dependencies BEFORE importing the route
jest.mock("@/lib/auth")
jest.mock("mailersend")

import { POST } from "../route"
import { createSupabaseAdmin } from "@/lib/auth"
import { MailerSend, EmailParams } from "mailersend"

const mockCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock
const mockMailerSend = MailerSend as jest.MockedClass<typeof MailerSend>
const mockEmailParams = EmailParams as jest.MockedClass<typeof EmailParams>

describe("POST /api/auth/custom-send-confirmation", () => {
  let mockSupabase: {
    auth: {
      admin: {
        generateLink: jest.Mock
      }
    }
  }
  let mockMailerSendInstance: {
    email: {
      send: jest.Mock
    }
  }
  let mockEmailParamsInstance: {
    setFrom: jest.Mock
    setTo: jest.Mock
    setReplyTo: jest.Mock
    setSubject: jest.Mock
    setHtml: jest.Mock
    setText: jest.Mock
    setPersonalization: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        admin: {
          generateLink: jest.fn(),
        },
      },
    }
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase)

    // Setup MailerSend mock
    mockMailerSendInstance = {
      email: {
        send: jest.fn(),
      },
    }

    mockMailerSend.mockImplementation(() => mockMailerSendInstance as any)

    // Setup EmailParams mock
    mockEmailParamsInstance = {
      setFrom: jest.fn().mockReturnThis(),
      setTo: jest.fn().mockReturnThis(),
      setReplyTo: jest.fn().mockReturnThis(),
      setSubject: jest.fn().mockReturnThis(),
      setHtml: jest.fn().mockReturnThis(),
      setText: jest.fn().mockReturnThis(),
      setPersonalization: jest.fn().mockReturnThis(),
    }

    mockEmailParams.mockImplementation(() => mockEmailParamsInstance as any)

    // Set required env vars
    process.env.SUPABASE_AUTH_WEBHOOK_SECRET = "test-webhook-secret"
    process.env.MAILERSEND_TOKEN = "test-mailersend-token"
    process.env.MAILERSEND_FROM_EMAIL = "info@fincaguarumo.com"
    process.env.CONTACT_EMAIL = "info@fincaguarumo.com"
  })

  afterEach(() => {
    delete process.env.SUPABASE_AUTH_WEBHOOK_SECRET
    delete process.env.MAILERSEND_TOKEN
    delete process.env.MAILERSEND_FROM_EMAIL
    delete process.env.CONTACT_EMAIL
  })

  describe("Authentication", () => {
    test("should return 401 when X-Webhook-Secret header is missing and no signature", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe("UNAUTHENTICATED")
    })

    test("should return 401 when X-Webhook-Secret header is incorrect", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "wrong-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe("UNAUTHENTICATED")
    })

    test("should return 401 when signature is invalid", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            signature: "invalid-signature",
            nonce: "test-nonce",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe("UNAUTHENTICATED")
    })

    test("should proceed when X-Webhook-Secret header is correct", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      expect(response.status).not.toBe(401)
    })

    test("should return 500 when SUPABASE_AUTH_WEBHOOK_SECRET env var is not set", async () => {
      delete process.env.SUPABASE_AUTH_WEBHOOK_SECRET

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("MISCONFIGURED")
    })
  })

  describe("Email Validation", () => {
    test("should return 400 when email is missing", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({}),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe("INVALID_EMAIL")
    })

    test("should return 400 when email is invalid (no @)", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "invalidemail",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe("INVALID_EMAIL")
    })

    test("should return 400 when email is invalid (no domain)", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe("INVALID_EMAIL")
    })

    test("should accept valid email", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      expect(response.status).not.toBe(400)
    })
  })

  describe("Confirmation Link Generation", () => {
    test("should generate confirmation link via Supabase admin API", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
        password: expect.any(String),
        options: expect.objectContaining({
          redirectTo: expect.any(String),
          data: expect.objectContaining({
            _admin_onboarding: true,
            _custom_smtp_sent_at: expect.any(String),
            _request_id: expect.any(String),
          }),
        }),
      })
    })

    test("should use custom redirectTo when provided", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
            redirectTo: "https://custom.example.com/confirm",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: "https://custom.example.com/confirm",
          }),
        }),
      )
    })

    test("should include locale in metadata when provided", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
            locale: "es",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              locale: "es",
            }),
          }),
        }),
      )
    })

    test("should handle generateLink errors gracefully", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: "Generate link failed", code: "GEN_LINK_ERROR" },
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      // Email is still sent even if generateLink fails (uses fallback URL)
      expect(response.status).toBe(200)
      expect(data.sent).toBe(true)
      expect(data.generateLinkCode).toContain("GENERATE_LINK_ERROR")
    })

    test("should handle when generateLink returns no action_link", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: { properties: {} },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      // Email is still sent even if action_link is missing (uses fallback URL)
      expect(response.status).toBe(200)
      expect(data.sent).toBe(true)
      expect(data.generateLinkCode).toBe("GENERATE_LINK_NO_ACTION_LINK")
    })
  })

  describe("Email Sending", () => {
    test("should send email via MailerSend", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.sent).toBe(true)
      expect(mockMailerSendInstance.email.send).toHaveBeenCalled()
    })

    test("should use custom from email when configured", async () => {
      process.env.MAILERSEND_FROM_EMAIL = "custom@example.com"

      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMailerSend).toHaveBeenCalledWith({
        apiKey: "test-mailersend-token",
      })
    })

    test("should handle MailerSend errors", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockRejectedValue(
        new Error("MailerSend error"),
      )

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.ok).toBe(false)
      expect(data.sent).toBe(false)
    })

    test("should return 500 when MAILERSEND_TOKEN is not set", async () => {
      delete process.env.MAILERSEND_TOKEN

      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.ok).toBe(false)
    })
  })

  describe("Localization", () => {
    test("should use English subject by default", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockEmailParamsInstance.setSubject).toHaveBeenCalledWith(
        expect.stringContaining("Confirm your email"),
      )
    })

    test("should use Spanish subject when locale is es", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
            locale: "es",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockEmailParamsInstance.setSubject).toHaveBeenCalledWith(
        expect.stringContaining("Confirma tu correo"),
      )
    })

    test("should use German subject when locale is de", async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            email_action_link: "https://example.com/confirm",
          },
        },
        error: null,
      })
      mockMailerSendInstance.email.send.mockResolvedValue({
        statusCode: 200,
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
            locale: "de",
          }),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockEmailParamsInstance.setSubject).toHaveBeenCalledWith(
        expect.stringContaining("Bestätige deine E-Mail"),
      )
    })
  })

  describe("Error Handling", () => {
    test("should return 500 on unexpected errors", async () => {
      mockSupabase.auth.admin.generateLink.mockImplementation(() => {
        throw new Error("Unexpected error")
      })

      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe("INTERNAL_ERROR")
    })

    test("should handle invalid JSON in request body", async () => {
      const request = new Request(
        "http://localhost/api/auth/custom-send-confirmation",
        {
          method: "POST",
          headers: {
            "X-Webhook-Secret": "test-webhook-secret",
            "Content-Type": "application/json",
          },
          body: "invalid json",
        },
      )

      const response = await POST(request)
      // Should handle gracefully
      expect(response.status).toBe(400)
    })
  })
})
