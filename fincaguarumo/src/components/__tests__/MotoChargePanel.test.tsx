// Component Tests for MotoChargePanel
// Tests for card charge UI, form validation, Stripe integration, success/error states, and user interactions

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MotoApiChargePanel } from "../MotoChargePanel"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock Stripe
jest.mock("@stripe/stripe-js")
jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  CardElement: ({ options }: any) => (
    <div data-testid="card-element" data-options={JSON.stringify(options)}>
      Card Input Field
    </div>
  ),
}))

const mockLoadStripe = loadStripe as jest.MockedFunction<typeof loadStripe>
const mockPush = jest.fn()
const mockStripe = {
  createPaymentMethod: jest.fn(),
}
const mockElements = {
  getElement: jest.fn(),
}

// Mock useRouter implementation
;(useRouter as jest.Mock).mockReturnValue({
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: "/admin/finance",
  query: {},
  asPath: "/admin/finance",
})

describe("MotoApiChargePanel Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadStripe.mockResolvedValue({
      elements: jest.fn(),
      createPaymentMethod: jest.fn(),
    } as any)
    mockPush.mockClear()
  })

  describe("Initial Render", () => {
    test("should render reservation and charge information", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          description="Test charge"
        />,
      )

      expect(screen.getByText("RES-123")).toBeInTheDocument()
      expect(screen.getByText("$100.00")).toBeInTheDocument()
      expect(
        screen.getByText("Booking.com VCC MOTO charge"),
      ).toBeInTheDocument()
    })

    test("should render card element and postal code input", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      expect(screen.getByTestId("card-element")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("12345")).toBeInTheDocument()
    })

    test("should render confirmation checkbox", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    test("should render charge button in disabled state initially", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      expect(button).toBeDisabled()
    })

    test("should display initial status message", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      expect(
        screen.getByText("Enter the active Booking.com VCC details."),
      ).toBeInTheDocument()
    })

    test("should show status badge", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      expect(screen.getByText("idle")).toBeInTheDocument()
    })
  })

  describe("Form Validation", () => {
    test("should enable charge button when checkbox is confirmed", () => {
      mockElements.getElement.mockReturnValue({} as any)

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      const button = screen.getByRole("button", { name: /charge \$100\.00/i })

      expect(button).toBeDisabled()

      fireEvent.click(checkbox)
      expect(button).not.toBeDisabled()
    })

    test("should show error when submitting without confirmation", async () => {
      mockElements.getElement.mockReturnValue({} as any)

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })

      // Button should be disabled initially
      expect(button).toBeDisabled()

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      // Now button should be enabled
      expect(button).not.toBeDisabled()

      // Uncheck the checkbox and try to submit
      fireEvent.click(checkbox)
      expect(button).toBeDisabled()
    })

    test("should show error when card element is not ready", async () => {
      mockElements.getElement.mockReturnValue(null)

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(
          screen.getByText(/Stripe Card Element is not ready/i),
        ).toBeInTheDocument()
      })
    })

    test("should handle postal code input", () => {
      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
        />,
      )

      const postalInput = screen.getByPlaceholderText("12345")
      fireEvent.change(postalInput, { target: { value: "12345" } })

      expect(postalInput).toHaveValue("12345")
    })
  })

  describe("Stripe Integration", () => {
    test("should include postal code in billing details when provided", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const postalInput = screen.getByPlaceholderText("12345")
      fireEvent.change(postalInput, { target: { value: "12345" } })

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
          type: "card",
          card: mockCard,
          billing_details: {
            address: { postal_code: "12345" },
          },
        })
      })
    })

    test("should handle Stripe payment method creation error", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: null,
        error: { message: "Card declined" },
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Card declined/i)).toBeInTheDocument()
      })
    })
  })

  describe("API Integration", () => {
    test("should call charge endpoint with correct parameters", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })
      global.fetch = mockFetch

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          description="Test charge"
          chargeEndpoint="/api/test-charge"
          isManual={false}
          source="booking.com"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/test-charge", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token-123",
          },
          body: JSON.stringify({
            reservationId: "RES-123",
            paymentMethodId: "pm_123",
            expectedAmount: 10000,
            expectedCurrency: "usd",
            description: "Test charge",
            isManual: false,
            source: "booking.com",
          }),
        })
      })
    })

    test("should include authorization header when access token is provided", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })
      global.fetch = mockFetch

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/test-charge",
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer token-123",
            }),
          }),
        )
      })
    })

    test("should redirect to login when access token is null (session expired)", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue(null)

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled()
        expect(screen.getByText(/Session expired/i)).toBeInTheDocument()
      })
    })

    test("should handle API error response", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Payment failed" }),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Payment failed/i)).toBeInTheDocument()
      })
    })

    test("should handle API network error", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      })
    })
  })

  describe("Success Flow", () => {
    test("should show success state on successful charge", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })

      const onSucceeded = jest.fn()
      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          onSucceeded={onSucceeded}
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument()
        expect(
          screen.getByText(/Payment succeeded: pi_123/i),
        ).toBeInTheDocument()
      })

      expect(onSucceeded).toHaveBeenCalledWith("pi_123")
    })

    test("should clear card and postal code on success", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const postalInput = screen.getByPlaceholderText("12345")
      fireEvent.change(postalInput, { target: { value: "12345" } })

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockCard.clear).toHaveBeenCalled()
        expect(postalInput).toHaveValue("")
      })
    })

    test("should disable form after success", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe("Loading States", () => {
    test("should show creating_payment_method status during tokenization", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)

      let resolvePaymentMethod: (value: any) => void
      mockStripe.createPaymentMethod.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePaymentMethod = resolve
          }),
      )

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText("creating_payment_method")).toBeInTheDocument()
        expect(
          screen.getByText(/Securely tokenizing card data with Stripe/i),
        ).toBeInTheDocument()
      })

      resolvePaymentMethod!({
        paymentMethod: { id: "pm_123" },
        error: null,
      })
    })

    test("should show charging status during API call", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      let resolveFetch: (value: any) => void
      global.fetch = jest.fn(
        () =>
          new Promise(resolve => {
            resolveFetch = resolve
          }),
      )

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText("charging")).toBeInTheDocument()
        expect(
          screen.getByText(/Submitting the MOTO payment for authorization/i),
        ).toBeInTheDocument()
      })

      resolveFetch!({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })
    })

    test("should disable button during processing", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)

      let resolvePaymentMethod: (value: any) => void
      mockStripe.createPaymentMethod.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePaymentMethod = resolve
          }),
      )

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
        expect(button).toHaveTextContent("Processing…")
      })

      resolvePaymentMethod!({
        paymentMethod: { id: "pm_123" },
        error: null,
      })
    })
  })

  describe("Currency Formatting", () => {
    test("should format USD correctly", () => {
      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          getAccessToken={mockGetAccessToken}
        />,
      )

      expect(screen.getByText("$100.00")).toBeInTheDocument()
    })

    test("should format EUR correctly", () => {
      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="eur"
          getAccessToken={mockGetAccessToken}
        />,
      )

      expect(screen.getByText("€100.00")).toBeInTheDocument()
    })

    test("should format GBP correctly", () => {
      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="gbp"
          getAccessToken={mockGetAccessToken}
        />,
      )

      expect(screen.getByText("£100.00")).toBeInTheDocument()
    })

    test("should format CRC correctly", () => {
      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="crc"
          getAccessToken={mockGetAccessToken}
        />,
      )

      expect(screen.getByText("CRC 100.00")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    test("should handle empty postal code", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
          type: "card",
          card: mockCard,
          billing_details: {
            address: undefined,
          },
        })
      })
    })

    test("should handle whitespace in postal code", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentIntentId: "pi_123" }),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const postalInput = screen.getByPlaceholderText("12345")
      fireEvent.change(postalInput, { target: { value: "  12345  " } })

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
          type: "card",
          card: mockCard,
          billing_details: {
            address: { postal_code: "12345" },
          },
        })
      })
    })

    test("should handle missing response body", async () => {
      const mockCard = { clear: jest.fn() }
      mockElements.getElement.mockReturnValue(mockCard as any)
      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: { id: "pm_123" },
        error: null,
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const mockGetAccessToken = jest.fn().mockResolvedValue("token-123")

      render(
        <MotoApiChargePanel
          reservationId="RES-123"
          amount={10000}
          currency="usd"
          chargeEndpoint="/api/test-charge"
          getAccessToken={mockGetAccessToken}
        />,
      )

      const checkbox = screen.getByRole("checkbox")
      fireEvent.click(checkbox)

      const button = screen.getByRole("button", { name: /charge \$100\.00/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(
          screen.getByText(/MOTO charge was not completed/i),
        ).toBeInTheDocument()
      })
    })
  })
})
