import { BookingType, BOOKING_TYPE } from "../types"

export interface PricingRule {
  _id: string
  title: string
  ruleType: "base_rate" | "seasonal" | "discount" | "fee" | "tax"
  season?: "high" | "low" | "shoulder" | "all"
  startDate?: string
  endDate?: string
  basePrice?: number
  percentage?: number
  fixedAmount?: number
  minimumNights?: number
  description: string
  language: string
  isActive: boolean
  displayOrder?: number
}

export const EXTRA_GUEST_FEE = 20
export const MAX_EXTRA_GUESTS = 4
export const VAT_RATE = 0.13

export function calculateEffectivePrice({
  pricingRules,
  guests,
  duration,
  checkInDate,
  bookingType = BOOKING_TYPE.villa,
}: {
  pricingRules: PricingRule[]
  guests: number
  duration: number
  checkInDate?: Date
  bookingType?: BookingType
}): {
  basePrice: number
  priceForPeople: number
  priceWithVat: number
  total: number
  appliedRules: string[]
} {
  const appliedRules: string[] = []

  // Get base price from base_rate rules
  let basePrice = getDefaultBasePrice(pricingRules)
  appliedRules.push("Base rate")

  // Apply seasonal adjustments if checkInDate provided
  if (checkInDate) {
    const seasonalBasePrice = getSeasonalAdjustment(pricingRules, checkInDate)
    if (seasonalBasePrice !== 0) {
      basePrice = seasonalBasePrice // Override base price with seasonal rate
      appliedRules.push("Seasonal adjustment")
    }
  }

  // Apply duration discounts
  const discountMultiplier = getDurationDiscount(pricingRules, duration)
  if (discountMultiplier < 1) {
    basePrice = basePrice * discountMultiplier
    appliedRules.push(
      `Duration discount (${Math.round((1 - discountMultiplier) * 100)}%)`,
    )
  }

  // Calculate total based on booking type
  let total: number
  let priceForPeople: number
  let priceWithVat: number

  if (bookingType === BOOKING_TYPE.tour) {
    // Tour pricing: basePrice * guests + VAT (no extra guest fees)
    priceForPeople = basePrice
    priceWithVat = basePrice * (1 + VAT_RATE)
    total = priceWithVat * guests
  } else {
    // Villa pricing: basePrice + extra guest fees + VAT
    priceForPeople =
      basePrice + Math.min(guests - 1, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE
    priceWithVat = priceForPeople * (1 + VAT_RATE)
    total = priceWithVat * duration
  }

  return {
    basePrice,
    priceForPeople,
    priceWithVat,
    total,
    appliedRules,
  }
}

function getDefaultBasePrice(pricingRules: PricingRule[]): number {
  const baseRateRule = pricingRules.find(
    rule => rule.ruleType === "base_rate" && rule.isActive && rule.basePrice,
  )

  if (baseRateRule) {
    return baseRateRule.basePrice!
  }

  // Fallback
  console.warn("No base_rate pricing rule found, using fallback price")
  return 115
}

function getSeasonalAdjustment(
  pricingRules: PricingRule[],
  checkInDate: Date,
): number {
  const seasonalRules = pricingRules.filter(
    rule =>
      rule.ruleType === "seasonal" &&
      rule.isActive &&
      rule.basePrice && // Seasonal rules use basePrice, not percentage
      isDateInRange(checkInDate, rule.startDate, rule.endDate),
  )

  if (seasonalRules.length > 0) {
    // Use the first matching seasonal rule (ordered by displayOrder)
    const rule = seasonalRules[0]
    // Return the seasonal base price - this will override the default base price
    return rule.basePrice!
  }

  return 0 // No seasonal adjustment
}

function getDurationDiscount(
  pricingRules: PricingRule[],
  duration: number,
): number {
  // Check for discount rules that apply to this duration
  const discountRules = pricingRules.filter(
    rule =>
      rule.ruleType === "discount" &&
      rule.isActive &&
      rule.percentage &&
      (!rule.minimumNights || duration >= rule.minimumNights),
  )

  if (discountRules.length > 0) {
    // Use the best discount (highest percentage)
    const bestDiscount = discountRules.reduce((best, current) =>
      current.percentage! > best.percentage! ? current : best,
    )
    return (100 - bestDiscount.percentage!) / 100
  }

  // No discount rules found - return full price (no discount)
  return 1
}

function isDateInRange(
  date: Date,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate || !endDate) return false

  const checkDate = new Date(date)
  const start = new Date(startDate)
  const end = new Date(endDate)
  return checkDate >= start && checkDate <= end
}

// Backward compatibility function for existing calculateTotal
export function calculateTotalWithPricingRules({
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
}) {
  const stay = duration ?? 1

  const result = calculateEffectivePrice({
    pricingRules,
    guests,
    duration: stay,
    checkInDate,
    bookingType,
  })

  return {
    priceForPeople: result.priceForPeople,
    priceWithVat: result.priceWithVat,
    total: result.total,
  }
}
