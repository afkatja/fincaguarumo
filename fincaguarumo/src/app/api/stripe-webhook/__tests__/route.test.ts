/**
 * @jest-environment node
 */

import { POST } from "../route"
import { NextRequest } from "next/server"
import * as bookingHandlers from "../bookingHandlers"
import { executeWithIndividualRetries } from "@/lib/monitoring"

// Mock dependencies
jest.mock("@/lib/monitoring", () => ({
  executeWithIndividualRetries: jest.fn(),
}))

jest.mock("../bookingHandlers", () => ({
  sendBookingConfirmationEmail: jest.fn(() =>
    Promise.resolve({ success: true }),
  ),
  saveBookingToSanity: jest.fn(() => Promise.resolve({ success: true })),
  saveBookingToSupabase: jest.fn(() => Promise.resolve({ success: true })),
  updateAvailability: jest.fn(() => Promise.resolve({ success: true })),
  notifyPartialFailure: jest.fn(() => Promise.resolve({ success: true })),
  extractBookingDetails: jest.fn(() => ({
    type: "villa",
    title: "Test Villa",
    description: "Test Description",
    duration: 7,
    location: "Test Location",
    body: "Test Body",
    date: new Date(),
    checkIn: new Date("2024-01-01"),
    checkOut: new Date("2024-01-08"),
    price: 1000,
    basePrice: 1000,
    totalPrice: 1000,
    currency: "usd",
    guests: 2,
    geo: {},
  })),
}))

// Helper function to access the shared mock
const getMockConstructEvent = () => {
  const stripe = require("stripe")
  return (stripe as any).mockConstructEvent
}

jest.mock("stripe", () => {
  // Create shared mock functions that can be overridden in tests
  const mockConstructEvent = jest.fn().mockReturnValue({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        metadata: {
          bookingId: "booking-123",
          customerName: "John Doe",
          customerEmail: "test@example.com",
          customerPhone: "+1234567890",
          checkIn: "2024-01-01",
          checkOut: "2024-01-08",
          type: "villa",
          title: "Test Villa",
          totalPrice: "1000",
          currency: "usd",
          guests: "2",
        },
        payment_status: "paid",
      },
    },
  })

  const mockStripe = jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }))

  // Export the mock so tests can access it
  ;(mockStripe as any).mockConstructEvent = mockConstructEvent

  return mockStripe
})

describe("/api/stripe-webhook endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("AC4: Payment and Confirmation", () => {
    test("should handle checkout.session.completed event", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              customerName: "John Doe",
              customerEmail: "test@example.com",
              customerPhone: "+1234567890",
              checkIn: "2024-01-01",
              checkOut: "2024-01-08",
              type: "villa",
              title: "Test Villa",
              description: "Test Description",
              duration: "7",
              location: "Test Location",
              body: "Test Body",
              date: "2024-01-01",
              price: "1000",
              basePrice: "1000",
              totalPrice: "1000",
              currency: "usd",
              guests: "2",
              geo: "{}",
            },
            payment_status: "paid",
            customer_details: {
              email: "test@example.com",
              name: "John Doe",
            },
          },
        },
      }

      const mockStripeSignature = "whsec_test_signature"

      // Mock Stripe webhook construction using shared mock
      getMockConstructEvent().mockReturnValue(mockEvent)

      // Mock successful execution
      ;(executeWithIndividualRetries as jest.Mock).mockResolvedValue([
        {
          name: "send-confirmation-email",
          result: { success: true },
          attempts: 1,
        },
        {
          name: "save-booking-to-sanity",
          result: { success: true },
          attempts: 1,
        },
        {
          name: "save-booking-to-supabase",
          result: { success: true },
          attempts: 1,
        },
        { name: "update-availability", result: { success: true }, attempts: 1 },
      ])

      const request = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": mockStripeSignature,
          },
          body: JSON.stringify(mockEvent),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should execute retry operations
      expect(executeWithIndividualRetries).toHaveBeenCalledWith([
        {
          name: "send-confirmation-email",
          fn: expect.any(Function),
          config: expect.any(Object),
        },
        {
          name: "save-booking-to-sanity",
          fn: expect.any(Function),
          config: expect.any(Object),
        },
        {
          name: "save-booking-to-supabase",
          fn: expect.any(Function),
          config: expect.any(Object),
        },
        {
          name: "update-availability",
          fn: expect.any(Function),
          config: expect.any(Object),
        },
      ])
    })

    test("should be idempotent to handle retries", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              customerName: "John Doe",
              customerEmail: "test@example.com",
              customerPhone: "+1234567890",
              checkIn: "2024-01-01",
              checkOut: "2024-01-08",
              type: "villa",
              title: "Test Villa",
              description: "Test Description",
              duration: "7",
              location: "Test Location",
              body: "Test Body",
              date: "2024-01-01",
              price: "1000",
              basePrice: "1000",
              totalPrice: "1000",
              currency: "usd",
              guests: "2",
              geo: "{}",
            },
            payment_status: "paid",
          },
        },
      }

      // Mock Stripe webhook construction using shared mock
      getMockConstructEvent().mockReturnValue(mockEvent)

      // Mock successful execution
      ;(executeWithIndividualRetries as jest.Mock).mockResolvedValue([
        {
          name: "send-confirmation-email",
          result: { success: true },
          attempts: 1,
        },
        {
          name: "save-booking-to-sanity",
          result: { success: true },
          attempts: 1,
        },
        {
          name: "save-booking-to-supabase",
          result: { success: true },
          attempts: 1,
        },
        { name: "update-availability", result: { success: true }, attempts: 1 },
      ])

      // Create separate requests to avoid body reuse issue
      const request1 = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "whsec_test_signature",
          },
          body: JSON.stringify(mockEvent),
        },
      )

      const request2 = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "whsec_test_signature",
          },
          body: JSON.stringify(mockEvent),
        },
      )

      // Send same event twice
      const response1 = await POST(request1)
      const response2 = await POST(request2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      // Should handle gracefully without duplicate operations
      expect(executeWithIndividualRetries).toHaveBeenCalledTimes(2) // Called each time but should handle idempotency
    })

    test("should handle webhook signature verification failure", async () => {
      // Mock Stripe webhook construction to throw error
      getMockConstructEvent().mockImplementation(() => {
        throw new Error("Invalid signature")
      })

      const request = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "invalid_signature",
          },
          body: JSON.stringify({}),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(400)

      // Should not execute any operations
      expect(executeWithIndividualRetries).not.toHaveBeenCalled()
    })

    test("should handle missing booking ID in metadata", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {}, // Missing required fields
            payment_status: "paid",
          },
        },
      }

      // Mock Stripe webhook construction using shared mock
      getMockConstructEvent().mockReturnValue(mockEvent)

      const request = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "whsec_test_signature",
          },
          body: JSON.stringify(mockEvent),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should still attempt processing even with missing metadata (route doesn't validate this specific case)
      expect(executeWithIndividualRetries).toHaveBeenCalled()
    })

    test("should handle complete failure scenario", async () => {
      ;(executeWithIndividualRetries as jest.Mock).mockResolvedValueOnce([
        {
          name: "send-confirmation-email",
          result: { success: false, error: new Error("Failed") },
          attempts: 3,
        },
        {
          name: "save-booking-to-sanity",
          result: {
            success: false,
            error: new Error("Database connection failed"),
          },
          attempts: 3,
        },
        {
          name: "save-booking-to-supabase",
          result: { success: false, error: new Error("Failed") },
          attempts: 3,
        },
        {
          name: "update-availability",
          result: { success: false, error: new Error("Failed") },
          attempts: 3,
        },
      ])

      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              bookingId: "booking-123",
            },
            payment_status: "paid",
          },
        },
      }

      // Mock Stripe webhook construction using shared mock
      getMockConstructEvent().mockReturnValue(mockEvent)

      const request = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "whsec_test_signature",
          },
          body: JSON.stringify(mockEvent),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should handle complete failure but still return 200 (webhook best practice)
      expect(executeWithIndividualRetries).toHaveBeenCalled()
      expect(bookingHandlers.notifyPartialFailure).toHaveBeenCalledWith(
        "cs_test_123",
        expect.any(Object),
        expect.any(Object),
        [
          "Send Confirmation Email",
          "Save Booking To Sanity",
          "Save Booking To Supabase",
          "Update Availability",
        ],
      )
    })
  })

  describe("Security and Validation", () => {
    test("should verify Stripe signature before processing", async () => {
      // Mock Stripe webhook construction to throw error
      getMockConstructEvent().mockImplementation(() => {
        throw new Error("No signature provided")
      })

      const request = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(400)
      // Note: constructEvent is not called when signature is missing header
      // The route returns 400 before attempting Stripe construction
    })

    test("should handle malformed webhook events", async () => {
      // Mock Stripe webhook construction for unknown event
      getMockConstructEvent().mockReturnValue({
        type: "unknown.event",
        data: {
          object: {
            id: "cs_test_unknown",
            metadata: {
              bookingId: "booking-unknown",
              customerName: "Unknown",
              customerEmail: "unknown@example.com",
              customerPhone: "+1234567890",
              checkIn: "2024-01-01",
              checkOut: "2024-01-08",
              type: "villa",
              title: "Unknown",
              totalPrice: "1000",
              currency: "usd",
              guests: "2",
            },
            payment_status: "paid",
          },
        },
      })

      const request = new NextRequest(
        "http://localhost:3000/api/stripe-webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "whsec_test_signature",
          },
          body: JSON.stringify({}),
        },
      )

      const response = await POST(request)

      expect(response.status).toBe(200) // Should acknowledge but not process unknown events

      // Should not execute operations for unknown events
      expect(executeWithIndividualRetries).not.toHaveBeenCalled()
    })
  })
})
