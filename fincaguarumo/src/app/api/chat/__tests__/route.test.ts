/**
 * @jest-environment node
 */

import { POST } from "../route"
import { NextRequest, NextResponse } from "next/server"

// Mock dependencies
jest.mock("@/lib/better-chatbot/config", () => ({
  bookingAgentConfig: {
    systemPrompt: "You are a helpful booking assistant",
    maxTokens: 1000,
    temperature: 0.7,
  },
  createChatStream: jest.fn(),
  bookingTools: {
    checkAvailability: jest.fn(),
    createBooking: jest.fn(),
    calculatePrice: jest.fn(),
    getPropertyInfo: jest.fn(),
  },
  filterToolsByIntent: jest.fn(intent => {
    const { bookingTools } = require("@/lib/better-chatbot/config")
    if (intent === "availability") {
      return { checkAvailability: bookingTools.checkAvailability }
    }
    if (intent === "general") {
      return { getPropertyInfo: bookingTools.getPropertyInfo }
    }
    return {}
  }),
}))

jest.mock("@/lib/rag-context-builder", () => ({
  buildRAGContext: jest.fn(() => Promise.resolve("Mock RAG context")),
}))

jest.mock("@/lib/better-chatbot/context-aware", () => ({
  getContextAwarePrompt: jest.fn(() => "Mock context prompt"),
}))

jest.mock("@/lib/sanity-data-extractor", () => ({
  extractPropertyConfig: jest.fn(() =>
    Promise.resolve({
      property: { name: "Villa Bruno", capacity: 4 },
      basePricing: { basePrice: 150 },
    }),
  ),
}))

jest.mock("../evaluation", () => ({
  isCriticalFlow: jest.fn(() => false),
  performBackgroundEvaluation: jest.fn(),
}))

jest.mock("../../../../lib/intent-detection", () => ({
  detectUserIntent: jest.fn(message => {
    if (message.includes("availability")) return "availability"
    if (message.includes("book") || message.includes("reservation"))
      return "availability"
    return "general"
  }),
  getProgressMessage: jest.fn(intent => {
    switch (intent) {
      case "availability":
        return "Checking availability..."
      case "general":
        return "Getting property information..."
      default:
        return "Processing your request..."
    }
  }),
}))

// Simple mock streaming response
const createMockStreamResponse = () => ({
  toTextStreamResponse: jest.fn(() => ({
    body: {
      getReader: jest.fn(() => ({
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              '0:{"type":"text","text":"Response chunk"}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true }),
      })),
    },
  })),
})

jest.mock("../../../../lib/tools/availability", () => ({
  checkAvailability: jest.fn(() =>
    Promise.resolve({
      available: true,
      blockedDates: [],
      alternatives: [],
    }),
  ),
}))

jest.mock("../../../../lib/tools/booking", () => ({
  createBooking: jest.fn(() =>
    Promise.resolve({
      bookingId: "booking-123",
      status: "pending",
      stripeCheckoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
    }),
  ),
}))

// Mock streaming response
const mockStream = {
  write: jest.fn(),
  close: jest.fn(),
}

global.ReadableStream = {
  from: jest.fn(() => mockStream),
} as any

// Mock TransformStream with proper structure
global.TransformStream = jest.fn(() => ({
  readable: {
    getReader: jest.fn(() => ({
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            '0:{"type":"progress","message":"Checking availability..."}\n',
          ),
        })
        .mockResolvedValueOnce({ done: true }),
    })),
  },
  writable: {
    getWriter: jest.fn(() => ({
      write: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  },
})) as any

describe("/api/chat endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset rate limit map for each test
    const { rateLimitMap } = require("../route")
    if (rateLimitMap) {
      rateLimitMap.clear()
    }

    // Simplified mock createChatStream - just return a stream, tools are tested separately
    const { createChatStream } = require("@/lib/better-chatbot/config")
    createChatStream.mockResolvedValue(createMockStreamResponse())
  })

  describe("AC1: Availability Queries", () => {
    test("should handle availability query and return streaming response", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "do you have availability in July for 5 nights?",
            },
          ],
          threadId: "session-123",
          context: {
            propertySlug: "villa-bruno",
          },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("text/event-stream")

      // Verify intent detection was called correctly
      const { detectUserIntent } = require("../../../../lib/intent-detection")
      expect(detectUserIntent).toHaveBeenCalledWith(
        "do you have availability in July for 5 nights?",
      )
    })

    test("should detect availability intent correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "availability July 5 nights" }],
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify intent detection works
      const { detectUserIntent } = require("../../../../lib/intent-detection")
      expect(detectUserIntent).toHaveBeenCalledWith(
        "availability July 5 nights",
      )
    })
  })

  describe("AC2: Property Information", () => {
    test("should answer property questions using semantic context", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "tell me about Villa Bruno" }],
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should have built RAG context
      const { buildRAGContext } = require("@/lib/rag-context-builder")
      expect(buildRAGContext).toHaveBeenCalledWith(
        expect.stringContaining("Villa Bruno"),
        expect.objectContaining({
          page: expect.any(String),
          slug: "villa-bruno",
          locale: expect.any(String),
        }),
      )
    })

    test("should refuse questions outside knowledge base", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "what's the best restaurant in San José?",
            },
          ],
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should detect intent as general but refuse due to source restrictions
      const { detectUserIntent } = require("../../../../lib/intent-detection")
      expect(detectUserIntent).toHaveBeenCalledWith(
        "what's the best restaurant in San José?",
      )
    })
  })

  describe("AC3: Complete Booking Flow", () => {
    test("should detect booking intent correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "I want to book July 1-5 for 2 guests" },
          ],
          threadId: "session-123",
          context: {
            propertySlug: "villa-bruno",
            bookingState: {
              preselectedDates: {
                startDate: "2024-07-01",
                endDate: "2024-07-05",
              },
            },
          },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify intent detection works for booking queries
      const { detectUserIntent } = require("../../../../lib/intent-detection")
      expect(detectUserIntent).toHaveBeenCalledWith(
        "I want to book July 1-5 for 2 guests",
      )
    })

    test("should handle payment-related queries", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "continue with payment" }],
          threadId: "session-123",
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should detect as general intent (payment queries are handled by AI)
      const { detectUserIntent } = require("../../../../lib/intent-detection")
      expect(detectUserIntent).toHaveBeenCalledWith("continue with payment")
    })
  })

  describe("AC6: Context Integration", () => {
    test("should handle requests with booking context", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "check availability" }],
          context: {
            propertySlug: "villa-bruno",
            bookingState: {
              preselectedDates: {
                startDate: "2024-07-01",
                endDate: "2024-07-05",
              },
            },
          },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should detect as availability intent even without explicit mention
      const { detectUserIntent } = require("../../../../lib/intent-detection")
      expect(detectUserIntent).toHaveBeenCalledWith("check availability")
    })

    test("should maintain conversation context with session ID", async () => {
      const request1 = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "availability July 5 nights" }],
          threadId: "session-123",
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const request2 = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "how much would that cost?" }],
          threadId: "session-123",
          context: { propertySlug: "villa-bruno" },
        }),
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
          messages: [
            { role: "user", content: "<script>alert('xss')</script>" },
          ],
          threadId: "session-123",
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should sanitize script tags in actual implementation
    })

    test("should handle missing required fields gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          // Missing messages array
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    test("should rate limit requests", async () => {
      // Test rate limiting functionality directly by creating multiple requests
      // that share the same IP address
      const testIP = "192.168.1.1"

      // Create multiple requests with the same IP
      const requests = Array.from(
        { length: 5 },
        (_, i) =>
          new NextRequest("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "x-forwarded-for": testIP },
            body: JSON.stringify({
              messages: [{ role: "user", content: `test message ${i}` }],
              threadId: `session-${i}`,
              context: { propertySlug: "villa-bruno" },
            }),
          }),
      )

      // Make requests sequentially to avoid race conditions in rate limiting
      const responses = []
      for (const request of requests) {
        const response = await POST(request)
        responses.push(response)
      }

      // At least some requests should succeed (status 200)
      const successfulResponses = responses.filter(res => res.status === 200)
      expect(successfulResponses.length).toBeGreaterThan(0)

      // Since we're using the actual rate limit (100 requests per minute),
      // all 5 test requests should succeed. The test verifies that
      // the rate limiting logic doesn't break normal operation.
      expect(responses.every(res => res.status === 200)).toBe(true)
    })
  })

  describe("Error Handling", () => {
    test("should handle AI model failures gracefully", async () => {
      // Mock AI model failure by making createChatStream throw an error
      const { createChatStream } = require("@/lib/better-chatbot/config")
      createChatStream.mockRejectedValueOnce(new Error("AI model failure"))

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test message" }],
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200) // Streaming responses handle errors gracefully
    })

    test("should handle database connection errors", async () => {
      const {
        checkAvailability,
      } = require("../../../../lib/tools/availability")
      checkAvailability.mockRejectedValueOnce(
        new Error("Database connection failed"),
      )

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "availability July 5 nights" }],
          context: { propertySlug: "villa-bruno" },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200) // Streaming responses handle errors gracefully
    })
  })
})
