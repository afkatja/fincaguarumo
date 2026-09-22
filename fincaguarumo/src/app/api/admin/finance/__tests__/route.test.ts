// API Route Tests for Finance Charge Endpoint
// Tests for booking lookup, manual entry validation, Stripe charge flow, error scenarios, and authentication

// Mock dependencies BEFORE importing the route
jest.mock("stripe")
jest.mock("@/lib/auth")
jest.mock("@/lib/auth")

import { POST } from "../route"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseAdmin } from "@/lib/auth"
import { verifyAdminAuth } from "@/lib/auth"

const mockStripe = Stripe as jest.MockedClass<typeof Stripe>
const mockCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock
const mockVerifyAdminAuth = verifyAdminAuth as jest.Mock

describe("POST /api/admin/finance", () => {
  let mockStripeInstance: any
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Stripe mock with proper typing
    mockStripeInstance = {
      paymentIntents: {
        create: jest.fn() as jest.MockedFunction<any>,
      },
    }
    mockStripe.mockImplementation(() => mockStripeInstance)

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase)

    // Setup auth mock - by default allow access
    mockVerifyAdminAuth.mockResolvedValue(undefined)
  })

  describe("Authentication", () => {
    test("should return 401 when admin auth fails", async () => {
      mockVerifyAdminAuth.mockRejectedValue(new Error("Unauthorized"))

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    test("should proceed when admin auth succeeds", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      expect(response.status).not.toBe(401)
    })
  })

  describe("Request Validation", () => {
    test("should return 400 when reservationId is missing", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("reservationId and paymentMethodId are required")
    })

    test("should return 400 when paymentMethodId is missing", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("reservationId and paymentMethodId are required")
    })

    test("should return 400 when both required fields are missing", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("reservationId and paymentMethodId are required")
    })
  })

  describe("Manual Entry Validation", () => {
    test("should return 400 when manual mode without expectedAmount", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain(
        "expectedAmount and expectedCurrency are required",
      )
    })

    test("should return 400 when manual mode without expectedCurrency", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 10000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain(
        "expectedAmount and expectedCurrency are required",
      )
    })

    test("should return 400 when expectedAmount is not an integer", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 100.5,
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("expectedAmount must be a positive integer")
    })

    test("should return 400 when expectedAmount is zero", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 0,
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("expectedAmount must be a positive integer")
    })

    test("should return 400 when expectedAmount is negative", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: -100,
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("expectedAmount must be a positive integer")
    })

    test("should return 400 when expectedAmount exceeds maximum", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 1000001, // MAX_MANUAL_AMOUNT is 1000000
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain(
        "expectedAmount must be a positive integer (max 1000000 cents)",
      )
    })

    test("should return 400 when expectedCurrency is not allowed", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 10000,
          expectedCurrency: "jpy", // Not in allowed list
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain(
        "expectedCurrency must be one of: USD, EUR, GBP, CRC",
      )
    })

    test("should accept uppercase currency codes", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 10000,
          expectedCurrency: "USD", // Uppercase
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should accept lowercase currency codes", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 10000,
          expectedCurrency: "usd", // Lowercase
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should accept all allowed currencies", async () => {
      const allowedCurrencies = ["usd", "eur", "gbp", "crc"]

      for (const currency of allowedCurrencies) {
        mockStripeInstance.paymentIntents.create.mockResolvedValue({
          id: `pi_${currency}`,
          status: "succeeded",
        } as any)

        const request = new Request("http://localhost/api/admin/finance", {
          method: "POST",
          body: JSON.stringify({
            reservationId: "manual-123",
            paymentMethodId: "pm_123",
            isManual: true,
            expectedAmount: 10000,
            expectedCurrency: currency,
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })
  })

  describe("Booking Lookup - Auto Mode", () => {
    test("should find booking by internal ID", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paymentIntentId).toBe("pi_123")
      expect(mockSupabase.from).toHaveBeenCalledWith("bookings")
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "booking-123")
    })

    test("should find booking by external reservation ID when internal ID fails", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      // First call (internal ID) fails
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Not found" },
        })
        // Second call (external ID) succeeds
        .mockResolvedValueOnce({
          data: {
            id: "booking-456",
            total_price: 15000,
            currency: "eur",
            external_reservation_id: "ext-123",
            source: "booking.com",
          },
          error: null,
        })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "ext-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paymentIntentId).toBe("pi_123")
    })

    test("should filter by source when provided", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      // First call (internal ID) fails
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Not found" },
        })
        // Second call (external ID with source) succeeds
        .mockResolvedValueOnce({
          data: {
            id: "booking-456",
            total_price: 15000,
            currency: "eur",
            external_reservation_id: "ext-123",
            source: "airbnb",
          },
          error: null,
        })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "ext-123",
          paymentMethodId: "pm_123",
          source: "airbnb",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should return 404 when booking not found", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "nonexistent",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Reservation not found")
    })

    test("should return 400 when client expectedAmount differs from server", async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
          expectedAmount: 9999, // Different from server value
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Amount mismatch between client and server")
    })

    test("should return 400 when client expectedCurrency differs from server", async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
          expectedCurrency: "eur", // Different from server value
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Currency mismatch between client and server")
    })

    test("should default to usd when booking currency is null", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: null,
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: "usd",
        }),
        expect.any(Object),
      )
    })
  })

  describe("Stripe Charge Flow", () => {
    test("should create payment intent with correct parameters", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          currency: "usd",
          payment_method: "pm_123",
          confirm: true,
          payment_method_types: ["card"],
          payment_method_options: {
            card: {
              moto: true,
            },
          },
          description: "Booking.com VCC reservation ext-123",
          metadata: {
            reservation_id: "booking-123",
            external_reservation_id: "ext-123",
            source: "booking_com_vcc",
          },
        }),
        expect.objectContaining({
          idempotencyKey: expect.stringContaining(
            "booking-vcc:booking-123:10000:usd:attempt-pm_123",
          ),
        }),
      )
    })

    test("should use manual mode metadata when isManual is true", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 10000,
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            reservation_id: "manual-manual-123",
            external_reservation_id: "manual-123",
            source: "manual_vcc",
          },
        }),
        expect.any(Object),
      )
    })

    test("should return paymentIntentId on successful charge", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paymentIntentId).toBe("pi_123")
    })

    test("should return 422 when payment requires action (3D Secure)", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "requires_action",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBe(
        "Payment requires additional authentication (3D Secure)",
      )
      expect(data.status).toBe("requires_action")
    })

    test("should return 422 for other non-success payment statuses", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "requires_payment_method",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBe("Stripe payment status: requires_payment_method")
      expect(data.status).toBe("requires_payment_method")
    })

    test("should use idempotency key to prevent double charges", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      await POST(request)

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          idempotencyKey: "booking-vcc:booking-123:10000:usd:attempt-pm_123",
        }),
      )
    })
  })

  describe("Error Scenarios", () => {
    test("should handle Stripe API errors with status", async () => {
      const stripeError = new Error("Invalid API key") as any
      stripeError.status = 401
      stripeError.message = "Invalid API key"

      mockStripeInstance.paymentIntents.create.mockRejectedValue(stripeError)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Invalid API key")
    })

    test("should handle Stripe card errors with 402 status", async () => {
      const cardError = new Error("Your card was declined") as any
      cardError.type = "StripeCardError"
      cardError.message = "Your card was declined"

      mockStripeInstance.paymentIntents.create.mockRejectedValue(cardError)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toBe("Your card was declined")
    })

    test("should handle generic errors with 500 status", async () => {
      mockStripeInstance.paymentIntents.create.mockRejectedValue(
        new Error("Network error"),
      )

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: "ext-123",
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Internal server error")
    })

    test("should handle invalid JSON in request body", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: "invalid json",
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe("Edge Cases", () => {
    test("should handle maximum manual amount boundary", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 1000000, // Exactly at max
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should handle one cent above maximum manual amount", async () => {
      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 1000001, // One cent over max
          expectedCurrency: "usd",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    test("should handle currency case insensitivity", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "manual-123",
          paymentMethodId: "pm_123",
          isManual: true,
          expectedAmount: 10000,
          expectedCurrency: "UsD", // Mixed case
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test("should handle booking with null external_reservation_id", async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        status: "succeeded",
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "booking-123",
          total_price: 10000,
          currency: "usd",
          external_reservation_id: null,
          source: "booking.com",
        },
        error: null,
      })

      const request = new Request("http://localhost/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          reservationId: "booking-123",
          paymentMethodId: "pm_123",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Booking.com VCC reservation booking-123",
          metadata: expect.objectContaining({
            external_reservation_id: "booking-123",
          }),
        }),
        expect.any(Object),
      )
    })
  })
})
