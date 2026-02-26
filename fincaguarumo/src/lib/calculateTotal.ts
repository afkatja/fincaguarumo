import { BookingType, BOOKING_TYPE } from "../types"
import { calculateTotalWithPricingRules, PricingRule } from "./pricingEngine"

export const EXTRA_GUEST_FEE = 20
export const MAX_EXTRA_GUESTS = 4

// Legacy function for backward compatibility - creates pricingRules from price
export const calculateTotal = ({
  price,
  guests,
  bookingType,
  duration,
}: {
  price: number
  guests: number
  bookingType: BookingType
  duration?: number
}) => {
  // Create a mock pricing rule for backward compatibility
  const mockPricingRules: PricingRule[] = [
    {
      _id: "legacy-base-rate",
      title: "Legacy Base Rate",
      ruleType: "base_rate",
      basePrice: price,
      description: "Legacy base rate from hardcoded price",
      language: "en",
      isActive: true,
    },
  ]

  return calculateTotalWithPricingRules({
    pricingRules: mockPricingRules,
    guests,
    bookingType,
    duration,
  })
}

// New function that uses pricingRules
export const calculateTotalWithRules = ({
  pricingRules,
  guests,
  bookingType,
  duration,
  checkInDate,
}: {
  pricingRules: PricingRule[]
  guests: number
  bookingType: BookingType
  duration?: number
  checkInDate?: Date
}) => {
  // For villa bookings, checkInDate is required
  if (bookingType === BOOKING_TYPE.villa && !checkInDate) {
    throw new Error("checkInDate is required for villa bookings")
  }

  return calculateTotalWithPricingRules({
    pricingRules,
    guests,
    bookingType,
    duration,
    checkInDate,
  })
}

export default calculateTotal
