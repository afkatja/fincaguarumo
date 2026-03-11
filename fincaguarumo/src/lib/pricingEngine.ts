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

export function getVatRate(pricingRules: PricingRule[]): number {
  return (
    (pricingRules.find(rule => rule.ruleType === "tax")?.percentage || 0) / 100
  )
}

export function getLowestPrice(pricingRules: PricingRule[]): number {
  if (!pricingRules || pricingRules.length === 0) {
    return 0
  }

  // Find lowest base rate from all pricing rules
  const baseRates = pricingRules
    .filter(rule => rule.isActive && rule.basePrice)
    .map(rule => rule.basePrice!)

  if (baseRates.length === 0) {
    return 0
  }

  const lowestBaseRate = Math.min(...baseRates)
  const vatRate = getVatRate(pricingRules)

  // Calculate for 1 guest, 1 night with VAT
  const priceForPerson = lowestBaseRate // No extra guest fees for 1 person
  const priceWithVat = priceForPerson * (1 + vatRate)

  return Math.floor(priceWithVat)
}

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

  // Ensure guests is a non-negative number
  const safeGuests = Math.max(0, guests || 0)

  if (bookingType === BOOKING_TYPE.tour) {
    // Tour pricing: basePrice * guests + VAT (no extra guest fees)
    priceForPeople = basePrice * safeGuests
    priceWithVat = priceForPeople * (1 + getVatRate(pricingRules))
    total = priceWithVat
  } else {
    // Villa pricing: basePrice + extra guest fees + VAT
    const extraGuests = Math.max(0, Math.min(safeGuests - 1, MAX_EXTRA_GUESTS))
    priceForPeople = basePrice + extraGuests * EXTRA_GUEST_FEE
    priceWithVat = priceForPeople * (1 + getVatRate(pricingRules))
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

export function getDefaultBasePrice(pricingRules: PricingRule[]): number {
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
    // Use the first matching seasonal rule (sorted by displayOrder)
    const sortedSeasonalRules = seasonalRules
      .slice()
      .sort(
        (a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity),
      )
    const rule = sortedSeasonalRules[0]
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

  // For recurring seasons, ignore year and only compare month and day
  const checkMonth = checkDate.getMonth()
  const checkDay = checkDate.getDate()
  const startMonth = start.getMonth()
  const startDay = start.getDate()
  const endMonth = end.getMonth()
  const endDay = end.getDate()

  // If start and end are in the same month
  if (startMonth === endMonth) {
    return (
      checkMonth === startMonth && checkDay >= startDay && checkDay <= endDay
    )
  }

  // If season spans across year boundary (e.g., Dec 15 - Mar 15)
  if (startMonth > endMonth) {
    return (
      (checkMonth === startMonth && checkDay >= startDay) ||
      (checkMonth === endMonth && checkDay <= endDay) ||
      checkMonth > startMonth ||
      checkMonth < endMonth
    )
  }

  // Normal case: season within same year (e.g., Mar 15 - Jun 15)
  return (
    (checkMonth === startMonth && checkDay >= startDay) ||
    (checkMonth === endMonth && checkDay <= endDay) ||
    (checkMonth > startMonth && checkMonth < endMonth)
  )
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
  console.log({ guests, result })

  return {
    priceForPeople: result.priceForPeople,
    priceWithVat: result.priceWithVat,
    total: result.total,
  }
}
