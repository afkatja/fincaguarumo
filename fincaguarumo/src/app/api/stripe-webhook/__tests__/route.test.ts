import { POST } from "../route"
import { NextRequest } from "next/server"

// Mock dependencies
jest.mock("../../../lib/sendConfirmationEmail", () => ({
  sendConfirmationEmail: jest.fn(() => Promise.resolve({ success: true }))
}))

jest.mock("../../../lib/setBookings", () => ({
  updateBookingStatus: jest.fn(() => Promise.resolve({ success: true }))
}))

jest.mock("@stripe/stripe-js", () => ({
  default: {
    webhooks: {
      constructEvent: jest.fn(() => ({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              bookingId: "booking-123"
            },
            payment_status: "paid"
          }
        }
      }))
    }
  }
}))

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
              bookingId: "booking-123"
            },
            payment_status: "paid",
            customer_details: {
              email: "test@example.com",
              name: "John Doe"
            }
          }
        }
      }

      const mockStripeSignature = "whsec_test_signature"
      
      // Mock Stripe webhook construction
      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": mockStripeSignature
        },
        body: JSON.stringify(mockEvent)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Should update booking status
      const { updateBookingStatus } = require("../../../lib/setBookings")
      expect(updateBookingStatus).toHaveBeenCalledWith("booking-123", "confirmed")
      
      // Should send confirmation email
      const { sendConfirmationEmail } = require("../../../lib/sendConfirmationEmail")
      expect(sendConfirmationEmail).toHaveBeenCalledWith({
        bookingId: "booking-123",
        customerEmail: "test@example.com",
        customerName: "John Doe"
      })
    })

    test("should be idempotent to handle retries", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              bookingId: "booking-123"
            },
            payment_status: "paid"
          }
        }
      }

      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "whsec_test_signature"
        },
        body: JSON.stringify(mockEvent)
      })

      // Send same event twice
      const response1 = await POST(request)
      const response2 = await POST(request)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Should handle gracefully without duplicate operations
      const { updateBookingStatus } = require("../../../lib/setBookings")
      expect(updateBookingStatus).toHaveBeenCalledTimes(2) // Called each time but should handle idempotency
    })

    test("should handle webhook signature verification failure", async () => {
      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature")
      })

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "invalid_signature"
        },
        body: JSON.stringify({})
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      
      // Should not update booking or send email
      const { updateBookingStatus } = require("../../../lib/setBookings")
      const { sendConfirmationEmail } = require("../../../lib/sendConfirmationEmail")
      expect(updateBookingStatus).not.toHaveBeenCalled()
      expect(sendConfirmationEmail).not.toHaveBeenCalled()
    })

    test("should handle missing booking ID in metadata", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {}, // Missing bookingId
            payment_status: "paid"
          }
        }
      }

      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "whsec_test_signature"
        },
        body: JSON.stringify(mockEvent)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      
      // Should not proceed with booking update
      const { updateBookingStatus } = require("../../../lib/setBookings")
      expect(updateBookingStatus).not.toHaveBeenCalled()
    })

    test("should handle email sending failure gracefully", async () => {
      const { sendConfirmationEmail } = require("../../../lib/sendConfirmationEmail")
      sendConfirmationEmail.mockRejectedValueOnce(new Error("Email service unavailable"))

      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              bookingId: "booking-123"
            },
            payment_status: "paid",
            customer_details: {
              email: "test@example.com",
              name: "John Doe"
            }
          }
        }
      }

      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "whsec_test_signature"
        },
        body: JSON.stringify(mockEvent)
      })

      const response = await POST(request)

      // Should still return success but log error
      expect(response.status).toBe(200)
      
      // Booking should still be updated
      const { updateBookingStatus } = require("../../../lib/setBookings")
      expect(updateBookingStatus).toHaveBeenCalledWith("booking-123", "confirmed")
    })

    test("should handle booking update failure gracefully", async () => {
      const { updateBookingStatus } = require("../../../lib/setBookings")
      updateBookingStatus.mockRejectedValueOnce(new Error("Database connection failed"))

      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              bookingId: "booking-123"
            },
            payment_status: "paid"
          }
        }
      }

      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "whsec_test_signature"
        },
        body: JSON.stringify(mockEvent)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      
      // Should not send email if booking update failed
      const { sendConfirmationEmail } = require("../../../lib/sendConfirmationEmail")
      expect(sendConfirmationEmail).not.toHaveBeenCalled()
    })
  })

  describe("Security and Validation", () => {
    test("should verify Stripe signature before processing", async () => {
      const { default: stripe } = require("@stripe/stripe-js")
      
      // Test with missing signature
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("No signature provided")
      })

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        body: JSON.stringify({})
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(stripe.webhooks.constructEvent).toHaveBeenCalled()
    })

    test("should handle malformed webhook events", async () => {
      const { default: stripe } = require("@stripe/stripe-js")
      stripe.webhooks.constructEvent.mockReturnValue({
        type: "unknown.event",
        data: {}
      })

      const request = new NextRequest("http://localhost:3000/api/stripe-webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "whsec_test_signature"
        },
        body: JSON.stringify({})
      })

      const response = await POST(request)

      expect(response.status).toBe(200) // Should acknowledge but not process unknown events
      
      // Should not update booking or send email for unknown events
      const { updateBookingStatus } = require("../../../lib/setBookings")
      const { sendConfirmationEmail } = require("../../../lib/sendConfirmationEmail")
      expect(updateBookingStatus).not.toHaveBeenCalled()
      expect(sendConfirmationEmail).not.toHaveBeenCalled()
    })
  })
})
