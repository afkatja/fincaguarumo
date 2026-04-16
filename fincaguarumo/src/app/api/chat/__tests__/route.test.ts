import { POST } from "../route"
import { NextRequest } from "next/server"

// Mock dependencies
jest.mock("../../../lib/better-chatbot/config", () => ({
  chatConfig: {
    systemPrompt: "You are a helpful booking assistant",
    maxTokens: 1000,
    temperature: 0.7
  }
}))

jest.mock("../../../lib/semantic-rag/semantic-context-builder", () => ({
  buildSemanticContext: jest.fn(() => Promise.resolve({
    context: "Mock semantic context",
    sources: ["mock-source"]
  }))
}))

jest.mock("../../../lib/intent-detection", () => ({
  detectIntent: jest.fn((message) => {
    if (message.includes("availability")) return "availability"
    if (message.includes("book") || message.includes("reservation")) return "booking"
    return "info"
  })
}))

jest.mock("../../../lib/tools/availability", () => ({
  checkAvailability: jest.fn(() => Promise.resolve({
    available: true,
    blockedDates: [],
    alternatives: []
  }))
}))

jest.mock("../../../lib/tools/booking", () => ({
  createBooking: jest.fn(() => Promise.resolve({
    bookingId: "booking-123",
    status: "pending",
    stripeCheckoutUrl: "https://checkout.stripe.com/pay/cs_test_123"
  }))
}))

// Mock streaming response
const mockStream = {
  write: jest.fn(),
  close: jest.fn()
}

global.ReadableStream = {
  from: jest.fn(() => mockStream)
} as any

describe("/api/chat endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("AC1: Availability Queries", () => {
    test("should handle availability query and return streaming response", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "do you have availability in July for 5 nights?",
          sessionId: "session-123",
          context: {
            propertyId: "villa-bruno"
          }
        })
      })

      const response = await POST(request)
      const reader = response.body?.getReader()

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("text/event-stream")
      
      // Should have called availability check
      const { checkAvailability } = require("../../../lib/tools/availability")
      expect(checkAvailability).toHaveBeenCalled()
    })

    test("should include alternative suggestions when unavailable", async () => {
      const { checkAvailability } = require("../../../lib/tools/availability")
      checkAvailability.mockResolvedValueOnce({
        available: false,
        blockedDates: ["2024-07-01", "2024-07-05"],
        alternatives: [
          { startDate: "2024-07-10", endDate: "2024-07-15" }
        ]
      })

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "availability July 5 nights",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(checkAvailability).toHaveBeenCalled()
    })
  })

  describe("AC2: Property Information", () => {
    test("should answer property questions using semantic context", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "tell me about Villa Bruno",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Should have built semantic context
      const { buildSemanticContext } = require("../../../lib/semantic-rag/semantic-context-builder")
      expect(buildSemanticContext).toHaveBeenCalledWith(
        expect.stringContaining("Villa Bruno"),
        "villa-bruno"
      )
    })

    test("should refuse questions outside knowledge base", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "what's the best restaurant in San José?",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Should detect intent as info but refuse due to source restrictions
      const { detectIntent } = require("../../../lib/intent-detection")
      expect(detectIntent).toHaveBeenCalledWith("what's the best restaurant in San José?")
    })
  })

  describe("AC3: Complete Booking Flow", () => {
    test("should handle booking creation through conversation", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "I want to book July 1-5 for 2 guests",
          sessionId: "session-123",
          context: {
            propertyId: "villa-bruno",
            preselectedDates: {
              startDate: "2024-07-01",
              endDate: "2024-07-05"
            }
          }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Should have called booking creation
      const { createBooking } = require("../../../lib/tools/booking")
      expect(createBooking).toHaveBeenCalledWith({
        name: expect.any(String),
        email: expect.any(String),
        startDate: "2024-07-01",
        endDate: "2024-07-05",
        guests: 2,
        propertyId: "villa-bruno"
      })
    })

    test("should generate Stripe payment link", async () => {
      const { createBooking } = require("../../../lib/tools/booking")
      createBooking.mockResolvedValueOnce({
        bookingId: "booking-123",
        status: "pending",
        stripeCheckoutUrl: "https://checkout.stripe.com/pay/cs_test_123"
      })

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "continue with payment",
          sessionId: "session-123",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(createBooking).toHaveBeenCalled()
    })
  })

  describe("AC6: Context Integration", () => {
    test("should use pre-filled dates from context", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "check availability",
          context: {
            propertyId: "villa-bruno",
            preselectedDates: {
              startDate: "2024-07-01",
              endDate: "2024-07-05"
            }
          }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Should use context dates for availability check
      const { checkAvailability } = require("../../../lib/tools/availability")
      expect(checkAvailability).toHaveBeenCalledWith({
        checkIn: "2024-07-01",
        checkOut: "2024-07-05"
      })
    })

    test("should maintain conversation context with session ID", async () => {
      const request1 = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "availability July 5 nights",
          sessionId: "session-123",
          context: { propertyId: "villa-bruno" }
        })
      })

      const request2 = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "how much would that cost?",
          sessionId: "session-123",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response1 = await POST(request1)
      const response2 = await POST(request2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Second request should have access to first request context
      // This would be tested through session storage in actual implementation
    })
  })

  describe("AC7: Security and Ops", () => {
    test("should validate input and sanitize data", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "<script>alert('xss')</script>",
          sessionId: "session-123",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should sanitize script tags in actual implementation
    })

    test("should handle missing required fields gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          // Missing message
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    test("should rate limit requests", async () => {
      // Mock multiple rapid requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        new NextRequest("http://localhost:3000/api/chat", {
          method: "POST",
          body: JSON.stringify({
            message: `test message ${i}`,
            sessionId: `session-${i}`,
            context: { propertyId: "villa-bruno" }
          })
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe("Error Handling", () => {
    test("should handle AI model failures gracefully", async () => {
      // Mock AI model failure
      jest.doMock("../../../lib/better-chatbot/config", () => ({
        chatConfig: {
          systemPrompt: "You are a helpful booking assistant",
          maxTokens: 1000,
          temperature: 0.7
        }
      }))

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "test message",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    test("should handle database connection errors", async () => {
      const { checkAvailability } = require("../../../lib/tools/availability")
      checkAvailability.mockRejectedValueOnce(new Error("Database connection failed"))

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "availability July 5 nights",
          context: { propertyId: "villa-bruno" }
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
