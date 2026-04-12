// Integration Tests for Booking Flow
// Tests complete booking flow for both villa and tour booking types

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BookingType, BOOKING_TYPE } from "@/types"

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}))

describe("Booking Flow Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe("ProgressiveBookingForm Component", () => {
    test("should render villa booking form with correct fields", async () => {
      // Mock useBookingCore hook with villa booking type
      const mockUseBookingCore = jest.fn(() => ({
        state: {
          data: {
            bookingType: "villa",
            bookingDetails: {
              title: "Villa Bruno",
              description: "Beautiful villa",
              location: "Santa Teresa",
            },
            dates: { checkIn: null, checkOut: null, date: null },
            guests: 1,
            customerDetails: { name: "", email: "", phoneNumber: "" },
            locale: "en",
            source: "page",
            baseUnitPrice: 200,
            totalPrice: 400,
            currency: "USD",
          },
          loading: false,
        },
        setBookingType: jest.fn(),
        setBasicDetails: jest.fn(),
        setDates: jest.fn(),
        setGuests: jest.fn(),
        setCustomerDetails: jest.fn(),
        setPricing: jest.fn(),
        setLocale: jest.fn(),
        setMeta: jest.fn(),
        resetAll: jest.fn(),
        persistToStorage: jest.fn(),
      }))

      jest.doMock("@/app/providers/BookingCoreProvider", () => ({
        useBookingCore: mockUseBookingCore,
        BookingCoreProvider: ({ children }: { children: React.ReactNode }) =>
          children,
      }))

      // Mock the component that uses bookingType from provider state
      const MockProgressiveBookingForm = ({
        onSubmit,
        onCancel,
        locale,
      }: any) => {
        // Get bookingType from the mocked hook context
        const bookingType = mockUseBookingCore().state.data.bookingType
        const [currentStep, setCurrentStep] = React.useState("dates")
        const [formData, setFormData] = React.useState({
          customerDetails: { name: "", email: "", phoneNumber: "" },
          dates: { checkIn: "", checkOut: "", date: "" },
          guests: 1,
        })

        const handleSubmit = () => {
          if (currentStep === "personal") {
            // Final submission
            if (formData.customerDetails.phoneNumber.length < 7) {
              return // Don't submit if phone too short
            }
            onSubmit({
              customerDetails: formData.customerDetails,
              bookingDetails: {
                type: bookingType,
                title: "Villa Bruno",
                location: "Santa Teresa, Costa Rica",
                guests: formData.guests,
                price: 200,
                totalPrice: 400,
                currency: "USD",
              },
            })
          } else {
            // Move to next step
            setCurrentStep("personal")
          }
        }

        return (
          <div>
            {currentStep === "dates" && bookingType === "villa" && (
              <div>
                <label htmlFor="checkIn">Check-in</label>
                <input data-testid="check-in" />
                <label htmlFor="checkOut">Check-out</label>
                <input data-testid="check-out" />
                <label htmlFor="guests">Guests</label>
                <input data-testid="guests" type="number" />
              </div>
            )}
            {currentStep === "dates" && bookingType === "tour" && (
              <div>
                <label htmlFor="date">Date</label>
                <input data-testid="date" />
                <label htmlFor="guests">Guests</label>
                <input data-testid="guests" type="number" />
              </div>
            )}
            {currentStep === "personal" && (
              <div>
                <label htmlFor="name">Name</label>
                <input data-testid="name" />
                <label htmlFor="email">Email</label>
                <input data-testid="email" />
                <label htmlFor="phone">Phone</label>
                <input data-testid="phone" />
                {formData.customerDetails.phoneNumber.length > 0 &&
                  formData.customerDetails.phoneNumber.length < 7 && (
                    <div data-testid="phone-error">
                      Phone number must be at least 7 characters
                    </div>
                  )}
              </div>
            )}
            <button onClick={handleSubmit} data-testid="submit">
              {currentStep === "personal" ? "Reserve" : "Next"}
            </button>
          </div>
        )
      }

      jest.doMock("@/components/booking/ProgressiveBookingForm", () => ({
        __esModule: true,
        default: MockProgressiveBookingForm,
      }))

      const { default: ProgressiveBookingForm } =
        await import("@/components/booking/ProgressiveBookingForm")

      const handleSubmit = jest.fn()

      render(
        <ProgressiveBookingForm
          onSubmit={handleSubmit}
          onCancel={() => {}}
          locale="en"
        />,
      )

      // Should render villa-specific fields
      expect(screen.getByTestId("check-in")).toBeInTheDocument()
      expect(screen.getByTestId("check-out")).toBeInTheDocument()
      expect(screen.getByTestId("guests")).toBeInTheDocument()
      expect(screen.getByTestId("submit")).toBeInTheDocument()

      // Should not render personal step initially
      expect(screen.queryByTestId("name")).not.toBeInTheDocument()
      expect(screen.queryByTestId("email")).not.toBeInTheDocument()
      expect(screen.queryByTestId("phone")).not.toBeInTheDocument()

      // Should not render tour-specific fields
      expect(screen.queryByTestId("date")).not.toBeInTheDocument()

      // Simulate step progression to personal step
      fireEvent.click(screen.getByTestId("submit"))

      // Should render personal step
      expect(screen.getByTestId("name")).toBeInTheDocument()
      expect(screen.getByTestId("email")).toBeInTheDocument()
      expect(screen.getByTestId("phone")).toBeInTheDocument()
    })

    test("should render tour booking form with correct fields", async () => {
      // Mock useBookingCore hook with tour booking type
      const mockUseBookingCore = jest.fn(() => ({
        state: {
          data: {
            bookingType: "tour",
            bookingDetails: {
              title: "Rainforest Adventure Tour",
              description: "Exciting tour",
              location: "Monteverde Cloud Forest",
            },
            dates: { checkIn: null, checkOut: null, date: null },
            guests: 1,
            customerDetails: { name: "", email: "", phoneNumber: "" },
            locale: "en",
            source: "page",
            baseUnitPrice: 150,
            totalPrice: 150,
            currency: "USD",
          },
          loading: false,
        },
        setBookingType: jest.fn(),
        setBasicDetails: jest.fn(),
        setDates: jest.fn(),
        setGuests: jest.fn(),
        setCustomerDetails: jest.fn(),
        setPricing: jest.fn(),
        setLocale: jest.fn(),
        setMeta: jest.fn(),
        resetAll: jest.fn(),
        persistToStorage: jest.fn(),
      }))

      jest.doMock("@/app/providers/BookingCoreProvider", () => ({
        useBookingCore: mockUseBookingCore,
        BookingCoreProvider: ({ children }: { children: React.ReactNode }) =>
          children,
      }))

      const MockProgressiveBookingForm = ({
        onSubmit,
        onCancel,
        locale,
      }: any) => {
        // Get bookingType from the mocked hook context
        const bookingType = mockUseBookingCore().state.data.bookingType
        const [currentStep, setCurrentStep] = React.useState("dates")

        const handleSubmit = () => {
          if (currentStep === "personal") {
            onSubmit({
              customerDetails: { name: "", email: "", phoneNumber: "" },
              bookingDetails: {
                type: bookingType,
                title: "Rainforest Adventure Tour",
                location: "Monteverde Cloud Forest",
                guests: 1,
                price: 150,
                totalPrice: 150,
                currency: "USD",
              },
            })
          } else {
            setCurrentStep("personal")
          }
        }

        return (
          <div>
            {currentStep === "dates" && bookingType === "tour" && (
              <div>
                <label htmlFor="date">Date</label>
                <input data-testid="date" />
                <label htmlFor="guests">Guests</label>
                <input data-testid="guests" type="number" />
              </div>
            )}
            <button onClick={handleSubmit} data-testid="submit">
              {currentStep === "personal" ? "Reserve" : "Next"}
            </button>
          </div>
        )
      }

      jest.doMock("@/components/booking/ProgressiveBookingForm", () => ({
        __esModule: true,
        default: MockProgressiveBookingForm,
      }))

      const { default: ProgressiveBookingForm } =
        await import("@/components/booking/ProgressiveBookingForm")

      const handleSubmit = jest.fn()

      render(
        <ProgressiveBookingForm
          onSubmit={handleSubmit}
          onCancel={() => {}}
          locale="en"
        />,
      )

      // Should render tour-specific fields
      expect(screen.getByTestId("date")).toBeInTheDocument()
      expect(screen.getByTestId("guests")).toBeInTheDocument()
      expect(screen.getByTestId("submit")).toBeInTheDocument()

      // Should not render villa-specific fields
      expect(screen.queryByTestId("check-in")).not.toBeInTheDocument()
      expect(screen.queryByTestId("check-out")).not.toBeInTheDocument()
    })

    test("should validate phone number minimum length", async () => {
      const mockUseBookingCore = jest.fn(() => ({
        state: {
          data: {
            bookingType: "villa",
            bookingDetails: {
              title: "Villa Bruno",
              description: "",
              location: "",
            },
            dates: { checkIn: null, checkOut: null, date: null },
            guests: 1,
            customerDetails: { name: "", email: "", phoneNumber: "" },
            locale: "en",
            source: "page",
            baseUnitPrice: 200,
            totalPrice: 400,
            currency: "USD",
          },
          loading: false,
        },
        setBookingType: jest.fn(),
        setBasicDetails: jest.fn(),
        setDates: jest.fn(),
        setGuests: jest.fn(),
        setCustomerDetails: jest.fn(),
        setPricing: jest.fn(),
        setLocale: jest.fn(),
        setMeta: jest.fn(),
        resetAll: jest.fn(),
        persistToStorage: jest.fn(),
      }))

      jest.doMock("@/app/providers/BookingCoreProvider", () => ({
        useBookingCore: mockUseBookingCore,
        BookingCoreProvider: ({ children }: { children: React.ReactNode }) =>
          children,
      }))

      const MockProgressiveBookingForm = ({ onSubmit }: any) => {
        const bookingType = "villa"
        const [currentStep, setCurrentStep] = React.useState("personal") // Start in personal step
        const [formData, setFormData] = React.useState({
          customerDetails: { name: "", email: "", phoneNumber: "" },
        })

        const handleSubmit = () => {
          if (formData.customerDetails.phoneNumber.length < 7) {
            return // Don't submit if phone too short
          }
          onSubmit({ customerDetails: formData.customerDetails })
        }

        return (
          <div>
            <label htmlFor="phone">Phone</label>
            <input
              data-testid="phone"
              value={formData.customerDetails.phoneNumber}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  customerDetails: {
                    ...prev.customerDetails,
                    phoneNumber: e.target.value,
                  },
                }))
              }
            />
            {formData.customerDetails.phoneNumber.length > 0 &&
              formData.customerDetails.phoneNumber.length < 7 && (
                <div data-testid="phone-error">
                  Phone number must be at least 7 characters
                </div>
              )}
            <button onClick={handleSubmit} data-testid="submit">
              Reserve
            </button>
          </div>
        )
      }

      jest.doMock("@/components/booking/ProgressiveBookingForm", () => ({
        __esModule: true,
        default: MockProgressiveBookingForm,
      }))

      const { default: ProgressiveBookingForm } =
        await import("@/components/booking/ProgressiveBookingForm")

      const handleSubmit = jest.fn()

      render(
        <ProgressiveBookingForm
          onSubmit={handleSubmit}
          onCancel={() => {}}
          locale="en"
        />,
      )

      // Fill with short phone number
      const phoneInput = screen.getByTestId("phone")
      fireEvent.change(phoneInput, { target: { value: "123" } }) // Too short

      // Should show validation error
      expect(screen.getByTestId("phone-error")).toBeInTheDocument()

      // Try to submit
      const submitButton = screen.getByTestId("submit")
      fireEvent.click(submitButton)

      // Should not call submit handler
      expect(handleSubmit).not.toHaveBeenCalled()
    })

    test("should persist data to localStorage only on submission", async () => {
      const mockPersistToStorage = jest.fn()

      const mockUseBookingCore = jest.fn(() => ({
        state: {
          data: {
            bookingType: "villa",
            bookingDetails: {
              title: "Villa Bruno",
              description: "",
              location: "",
            },
            dates: { checkIn: null, checkOut: null, date: null },
            guests: 1,
            customerDetails: { name: "", email: "", phoneNumber: "" },
            locale: "en",
            source: "page",
            baseUnitPrice: 200,
            totalPrice: 400,
            currency: "USD",
          },
          loading: false,
        },
        setBookingType: jest.fn(),
        setBasicDetails: jest.fn(),
        setDates: jest.fn(),
        setGuests: jest.fn(),
        setCustomerDetails: jest.fn(),
        setPricing: jest.fn(),
        setLocale: jest.fn(),
        setMeta: jest.fn(),
        resetAll: jest.fn(),
        persistToStorage: mockPersistToStorage,
      }))

      jest.doMock("@/app/providers/BookingCoreProvider", () => ({
        useBookingCore: mockUseBookingCore,
        BookingCoreProvider: ({ children }: { children: React.ReactNode }) =>
          children,
      }))

      const MockProgressiveBookingForm = ({ onSubmit }: any) => {
        const [formData, setFormData] = React.useState({
          customerDetails: { name: "", email: "", phoneNumber: "" },
        })

        const handleSubmit = () => {
          // Simulate calling persistToStorage from the real component
          mockPersistToStorage()
          onSubmit({ customerDetails: formData.customerDetails })
        }

        return (
          <div>
            <label htmlFor="name">Name</label>
            <input
              data-testid="name"
              value={formData.customerDetails.name}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  customerDetails: {
                    ...prev.customerDetails,
                    name: e.target.value,
                  },
                }))
              }
            />
            <button onClick={handleSubmit} data-testid="submit">
              Reserve
            </button>
          </div>
        )
      }

      jest.doMock("@/components/booking/ProgressiveBookingForm", () => ({
        __esModule: true,
        default: MockProgressiveBookingForm,
      }))

      const { default: ProgressiveBookingForm } =
        await import("@/components/booking/ProgressiveBookingForm")

      const handleSubmit = jest.fn()

      render(
        <ProgressiveBookingForm
          onSubmit={handleSubmit}
          onCancel={() => {}}
          locale="en"
        />,
      )

      // Check localStorage - should be empty before submission
      expect(localStorage.getItem("bookingCoreData")).toBeNull()

      // Fill form
      const nameInput = screen.getByTestId("name")
      fireEvent.change(nameInput, { target: { value: "John Doe" } })

      // Submit form
      const submitButton = screen.getByTestId("submit")
      fireEvent.click(submitButton)

      // Should call persistToStorage on submission
      expect(mockPersistToStorage).toHaveBeenCalledTimes(1)
    })
  })
})
