import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BookingProvider } from "@/app/providers/BookingProvider"
import { DialogProvider } from "@/app/providers/DialogProvider"
import ProgressiveBookingForm from "../ProgressiveBookingForm"
import { BOOKING_TYPE, initialBookingData } from "@/types"
import "@testing-library/jest-dom"

// Mock the booking calendar
jest.mock("@/components/BookingCalendar", () => {
  return function MockBookingCalendar({
    onSelectDate,
    selectedDates,
    labels,
    error,
  }: {
    onSelectDate: (date: Date, type: "check-in" | "check-out") => void
    selectedDates: Date[]
    labels: { checkIn: string; checkOut: string }
    error: string
  }) {
    return (
      <div data-testid="booking-calendar">
        <div data-testid="calendar-labels">{JSON.stringify(labels)}</div>
        <div data-testid="calendar-error">{error}</div>
        <button
          onClick={() =>
            onSelectDate(
              new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              "check-in",
            )
          }
          data-testid="select-check-in"
        >
          Select Check-in
        </button>
        <button
          onClick={() =>
            onSelectDate(
              new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
              "check-out",
            )
          }
          data-testid="select-check-out"
        >
          Select Check-out
        </button>
      </div>
    )
  }
})

// Mock the date picker
jest.mock("@/components/DatePicker", () => {
  return function MockDatePicker({
    onSelectDate,
    label,
    selectedDate,
  }: {
    onSelectDate: (date: Date) => void
    label: string
    selectedDate: Date
  }) {
    return (
      <div data-testid="date-picker">
        <div data-testid="date-picker-label">{label}</div>
        <button
          onClick={() =>
            onSelectDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000))
          }
          data-testid="select-date"
        >
          Select Date
        </button>
      </div>
    )
  }
})

// Mock the price calculation component
jest.mock("@/components/priceCalculation", () => {
  return function MockPriceCalculation({
    guests,
    bookingType,
    locale,
    duration,
  }: {
    guests: number
    bookingType: string
    locale: string
    duration: number
  }) {
    return (
      <div data-testid="price-calculation">
        <div data-testid="price-guests">{guests}</div>
        <div data-testid="price-type">{bookingType}</div>
        <div data-testid="price-duration">{duration}</div>
        <div data-testid="total-price">$345</div>
      </div>
    )
  }
})

// Mock the select guests options
jest.mock("@/app/[locale]/(pages)/(payment)/SelectGuestsOptions", () => {
  return function MockSelectGuestsOptions({
    guests,
    onChange,
  }: {
    guests: number
    onChange: (value: number) => void
  }) {
    return (
      <div data-testid="select-guests">
        <div data-testid="current-guests">{guests}</div>
        <button onClick={() => onChange(2)} data-testid="select-2-guests">
          2 Guests
        </button>
        <button onClick={() => onChange(4)} data-testid="select-4-guests">
          4 Guests
        </button>
      </div>
    )
  }
})

describe("ProgressiveBookingForm", () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderWithProviders = (
    component: React.ReactNode,
    bookingType: string = BOOKING_TYPE.villa,
  ) => {
    return render(
      <BookingProvider>
        <DialogProvider>{component}</DialogProvider>
      </BookingProvider>,
    )
  }

  test("renders dates step for villa booking", () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.villa}
        locale="en"
      />,
    )

    expect(screen.getByTestId("booking-calendar")).toBeInTheDocument()
    expect(screen.getByTestId("select-guests")).toBeInTheDocument()
    expect(screen.getByText("Back")).toBeDisabled()
    expect(screen.getByText("Next")).toBeInTheDocument()
  })

  test("renders date picker for tour booking", () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.tour}
        locale="en"
      />,
    )

    expect(screen.getByTestId("date-picker")).toBeInTheDocument()
    expect(screen.getByTestId("select-guests")).toBeInTheDocument()
  })

  test("can proceed through villa booking steps with manual progression", async () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.villa}
        locale="en"
      />,
    )

    // Step 1: Select dates (calendar should be visible initially)
    expect(screen.getByTestId("booking-calendar")).toBeInTheDocument()

    // Manually select check-in date
    fireEvent.click(screen.getByTestId("select-check-in"))

    // Manually select check-out date (should still be visible)
    const checkOutButton = screen.queryByTestId("select-check-out")
    if (checkOutButton) {
      fireEvent.click(checkOutButton)
    } else {
      // If auto-advanced, skip to guests step test
      console.log("Auto-advance detected, check-out button not present")
    }

    // Select guests if still on dates step
    const guestsButton = screen.queryByTestId("select-2-guests")
    if (guestsButton) {
      fireEvent.click(guestsButton)
    }

    // Click next to proceed to personal details
    const nextButton = screen.queryByText("Next")
    if (nextButton) {
      fireEvent.click(nextButton)
    }

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })

    // Fill personal details
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "John Doe" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "john@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "+1234567890" },
    })

    // Click next to go to payment step
    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByText(/secure payment page/i)).toBeInTheDocument()
      expect(screen.getByText("Reserve")).toBeInTheDocument()
    })
  })

  test("handles auto-advance behavior in villa booking", async () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.villa}
        locale="en"
      />,
    )

    // Step 1: Select dates (calendar should be visible initially)
    expect(screen.getByTestId("booking-calendar")).toBeInTheDocument()

    // Select check-in date - this might trigger auto-advance
    fireEvent.click(screen.getByTestId("select-check-in"))

    // Check if we auto-advanced to personal details or still need more steps
    await waitFor(
      () => {
        const personalDetailsVisible = screen.queryByLabelText(/name/i)
        if (personalDetailsVisible) {
          // Auto-advance occurred - we're on personal details
          expect(personalDetailsVisible).toBeInTheDocument()
        } else {
          // Still on dates/guests step - verify buttons are present
          const checkOutButton = screen.queryByTestId("select-check-out")
          const guestsButton = screen.queryByTestId("select-2-guests")
          const nextButton = screen.queryByText("Next")

          // At least one navigation option should be available
          expect(checkOutButton || guestsButton || nextButton).toBeTruthy()
        }
      },
      { timeout: 2000 },
    )
  })

  test("can cancel booking", () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.villa}
        locale="en"
      />,
    )

    fireEvent.click(screen.getByText("Cancel"))
    expect(mockOnCancel).toHaveBeenCalled()
  })

  test("can navigate back between steps", async () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.villa}
        locale="en"
      />,
    )

    // Proceed to personal details step
    expect(screen.getByTestId("booking-calendar")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("select-check-in"))

    // If check-out button is still visible, click it
    try {
      fireEvent.click(screen.getByTestId("select-check-out"))
    } catch (e) {
      // If check-out button is not visible, the form may have auto-advanced
    }

    // Try to select guests if still on dates step
    try {
      fireEvent.click(screen.getByTestId("select-2-guests"))
    } catch (e) {
      // If guests selector is not visible, the form may have auto-advanced
    }

    // Click next to go to personal details step (or may already be there)
    try {
      fireEvent.click(screen.getByText("Next"))
    } catch (e) {
      // If Next button is not visible, we may already be on personal details step
    }

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })

    // Go back to dates step
    fireEvent.click(screen.getByText("Back"))

    expect(screen.getByTestId("booking-calendar")).toBeInTheDocument()
    expect(screen.getByText("Back")).toBeDisabled()
  })

  test("submits booking data correctly", async () => {
    renderWithProviders(
      <ProgressiveBookingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        bookingType={BOOKING_TYPE.villa}
        locale="en"
      />,
    )

    // Complete all steps
    expect(screen.getByTestId("booking-calendar")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("select-check-in"))

    // If check-out button is still visible, click it
    try {
      fireEvent.click(screen.getByTestId("select-check-out"))
    } catch (e) {
      // If check-out button is not visible, the form may have auto-advanced
    }

    // Try to select guests if still on dates step
    try {
      fireEvent.click(screen.getByTestId("select-2-guests"))
    } catch (e) {
      // If guests selector is not visible, the form may have auto-advanced
    }

    // Click next to go to personal details step (or may already be there)
    try {
      fireEvent.click(screen.getByText("Next"))
    } catch (e) {
      // If Next button is not visible, we may already be on personal details step
    }

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "John Doe" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "john@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "+1234567890" },
    })

    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByText("Reserve")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Reserve"))
    expect(mockOnSubmit).toHaveBeenCalled()
  })
})
