import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ChatInterface } from "../ChatInterface"

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe("ChatInterface Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("AC1: Availability Queries", () => {
    test("should handle availability query and display response", async () => {
      const mockAvailabilityResponse = {
        available: true,
        blockedDates: [],
        alternatives: []
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockAvailabilityResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/ask about availability/i)
      const sendButton = screen.getByRole("button", { name: /send/i })

      fireEvent.change(input, {
        target: { value: "do you have availability in July for 5 nights?" }
      })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/available/i)).toBeInTheDocument()
      })
    })

    test("should show alternative dates when requested dates are unavailable", async () => {
      const mockUnavailableResponse = {
        available: false,
        blockedDates: ["2024-07-01", "2024-07-05"],
        alternatives: [
          { startDate: "2024-07-10", endDate: "2024-07-15" }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockUnavailableResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/ask about availability/i)
      fireEvent.change(input, {
        target: { value: "availability July 5 nights" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/not available/i)).toBeInTheDocument()
        expect(screen.getByText(/July 10-15/i)).toBeInTheDocument()
      })
    })

    test("should include pricing information when dates are available", async () => {
      const mockPricingResponse = {
        available: true,
        blockedDates: [],
        alternatives: [],
        pricing: {
          total: 575,
          perNight: 115,
          currency: "USD"
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPricingResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/ask about availability/i)
      fireEvent.change(input, {
        target: { value: "availability July 5 nights price" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/\$575/i)).toBeInTheDocument()
        expect(screen.getByText(/\$115.*night/i)).toBeInTheDocument()
      })
    })
  })

  describe("AC2: Property Information", () => {
    test("should answer property questions based on Sanity content", async () => {
      const mockPropertyResponse = {
        answer: "Villa Bruno is a beautiful 3-bedroom villa located in Santa Teresa, Costa Rica with ocean views and a private pool.",
        sources: ["villa-bruno-description"]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPropertyResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/ask about property/i)
      fireEvent.change(input, {
        target: { value: "tell me about Villa Bruno" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/3-bedroom villa/i)).toBeInTheDocument()
        expect(screen.getByText(/Santa Teresa/i)).toBeInTheDocument()
        expect(screen.getByText(/private pool/i)).toBeInTheDocument()
      })
    })

    test("should refuse questions outside knowledge base", async () => {
      const mockOutsideKBResponse = {
        answer: "I can only help you with information about Finca Guarumo and Villa Bruno properties. For restaurant recommendations in San José, I'd suggest checking local travel guides.",
        sources: []
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockOutsideKBResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/ask about property/i)
      fireEvent.change(input, {
        target: { value: "what's the best restaurant in San José?" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/can only help you with information/i)).toBeInTheDocument()
        expect(screen.getByText(/Finca Guarumo and Villa Bruno/i)).toBeInTheDocument()
      })
    })

    test("should provide contextual property-specific answers", async () => {
      const mockContextualResponse = {
        answer: "Villa Bruno has a maximum capacity of 6 guests across 3 bedrooms.",
        sources: ["villa-bruno-amenities"]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockContextualResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      const input = screen.getByPlaceholderText(/ask about property/i)
      fireEvent.change(input, {
        target: { value: "how many guests can stay here?" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/6 guests/i)).toBeInTheDocument()
        expect(screen.getByText(/3 bedrooms/i)).toBeInTheDocument()
      })
    })
  })

  describe("AC3: Complete Booking Flow", () => {
    test("should guide user through booking conversationally", async () => {
      // Mock availability check
      const mockAvailabilityResponse = {
        available: true,
        blockedDates: [],
        alternatives: [],
        pricing: { total: 575, perNight: 115, currency: "USD" }
      }

      // Mock booking creation
      const mockBookingResponse = {
        bookingId: "booking-123",
        status: "pending",
        stripeCheckoutUrl: "https://checkout.stripe.com/pay/cs_test_123"
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => mockAvailabilityResponse,
          ok: true
        })
        .mockResolvedValueOnce({
          json: async () => mockBookingResponse,
          ok: true
        })

      render(<ChatInterface propertyId="villa-bruno" />)

      // Start booking conversation
      const input = screen.getByPlaceholderText(/ask about availability/i)
      fireEvent.change(input, {
        target: { value: "I want to book July 1-5 for 2 guests" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/available/i)).toBeInTheDocument()
      })

      // Continue with guest details
      const nameInput = screen.getByPlaceholderText(/your name/i)
      const emailInput = screen.getByPlaceholderText(/your email/i)

      fireEvent.change(nameInput, { target: { value: "John Doe" } })
      fireEvent.change(emailInput, { target: { value: "john@example.com" } })

      fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }))

      await waitFor(() => {
        expect(screen.getByText(/booking summary/i)).toBeInTheDocument()
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
        expect(screen.getByText(/john@example.com/i)).toBeInTheDocument()
        expect(screen.getByText(/\$575/i)).toBeInTheDocument()
      })
    })

    test("should generate Stripe payment link within chat interface", async () => {
      const mockBookingResponse = {
        bookingId: "booking-123",
        status: "pending",
        stripeCheckoutUrl: "https://checkout.stripe.com/pay/cs_test_123"
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockBookingResponse,
        ok: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      // Simulate reaching payment step
      fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }))

      await waitFor(() => {
        const paymentLink = screen.getByRole("link", { name: /proceed to payment/i })
        expect(paymentLink).toHaveAttribute("href", "https://checkout.stripe.com/pay/cs_test_123")
      })
    })

    test("should collect all required booking fields conversationally", async () => {
      render(<ChatInterface propertyId="villa-bruno" />)

      // Should prompt for missing information step by step
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/phone number/i)).toBeInTheDocument()
      })

      // Should validate required fields before proceeding
      const continueButton = screen.getByRole("button", { name: /continue/i })
      fireEvent.click(continueButton)

      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/phone is required/i)).toBeInTheDocument()
    })
  })

  describe("AC4: Payment and Confirmation", () => {
    test("should display booking confirmation after successful payment", async () => {
      render(<ChatInterface propertyId="villa-bruno" />)

      // Simulate successful payment callback
      const paymentSuccessEvent = new CustomEvent("payment-successful", {
        detail: {
          bookingId: "booking-123",
          status: "confirmed"
        }
      })

      window.dispatchEvent(paymentSuccessEvent)

      await waitFor(() => {
        expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument()
        expect(screen.getByText(/booking-123/i)).toBeInTheDocument()
        expect(screen.getByText(/confirmation email sent/i)).toBeInTheDocument()
      })
    })
  })

  describe("AC6: Context Integration", () => {
    test("should pre-fill dates from URL parameters", () => {
      // Mock URL params
      Object.defineProperty(window, "location", {
        value: {
          search: "?checkIn=2024-07-01&checkOut=2024-07-05"
        },
        writable: true
      })

      render(<ChatInterface propertyId="villa-bruno" />)

      expect(screen.getByDisplayValue(/July 1, 2024/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/July 5, 2024/i)).toBeInTheDocument()
    })

    test("should maintain conversation context within session", async () => {
      render(<ChatInterface propertyId="villa-bruno" />)

      // Send first message
      const input = screen.getByPlaceholderText(/ask about availability/i)
      fireEvent.change(input, {
        target: { value: "availability July 5 nights" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/availability July 5 nights/i)).toBeInTheDocument()
      })

      // Send follow-up message without repeating context
      fireEvent.change(input, {
        target: { value: "how much would that cost?" }
      })
      fireEvent.click(screen.getByRole("button", { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/that would cost/i)).toBeInTheDocument()
      })
    })
  })
})
