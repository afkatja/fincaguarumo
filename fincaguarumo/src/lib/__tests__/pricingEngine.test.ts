import { calculateEffectivePrice, PricingRule } from "../pricingEngine"
import { BOOKING_TYPE } from "../../types"

describe("Pricing Engine", () => {
  const mockPricingRules: PricingRule[] = [
    {
      _id: "base-rate-1",
      title: "Standard Base Rate",
      ruleType: "base_rate",
      basePrice: 115,
      description: "Standard base rate",
      language: "en",
      isActive: true,
    },
    {
      _id: "discount-7-days",
      title: "Weekly Discount",
      ruleType: "discount",
      percentage: 13,
      minimumNights: 7,
      description: "13% discount for 7+ nights",
      language: "en",
      isActive: true,
    },
    {
      _id: "discount-28-days",
      title: "Monthly Discount",
      ruleType: "discount",
      percentage: 33,
      minimumNights: 28,
      description: "33% discount for 28+ nights",
      language: "en",
      isActive: true,
    },
  ]

  test("calculates base price for 1 guest, 1 night", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 1,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBe(115)
    expect(result.priceForPeople).toBe(115) // No extra guest fee
    expect(result.priceWithVat).toBeCloseTo(129.95, 2) // 115 * 1.13
    expect(result.total).toBeCloseTo(129.95, 2) // 129.95 * 1 night
  })

  test("calculates price for multiple guests with extra guest fees", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 3,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBe(115)
    expect(result.priceForPeople).toBe(155) // 115 + 2 * 20 (extra guest fees)
    expect(result.priceWithVat).toBeCloseTo(175.15, 2) // 155 * 1.13
    expect(result.total).toBeCloseTo(175.15, 2)
  })

  test("applies weekly discount for 7+ nights", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 2,
      duration: 7,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBeCloseTo(100.05, 2) // 115 * 0.87 (13% discount)
    expect(result.priceForPeople).toBeCloseTo(120.05, 2) // 100.05 + 20 (1 extra guest)
    expect(result.priceWithVat).toBeCloseTo(135.66, 2) // 120.05 * 1.13
    expect(result.total).toBeCloseTo(949.6, 2) // 135.66 * 7 nights
  })

  test("applies monthly discount for 28+ nights", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 1,
      duration: 28,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBeCloseTo(77.05, 2) // 115 * 0.67 (33% discount)
    expect(result.priceForPeople).toBeCloseTo(77.05, 2) // No extra guest fee
    expect(result.priceWithVat).toBeCloseTo(87.07, 2) // 77.05 * 1.13
    expect(result.total).toBeCloseTo(2437.86, 2) // 87.07 * 28 nights
  })

  test("handles tour booking type correctly", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 4,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.tour,
    })

    expect(result.basePrice).toBe(115)
    expect(result.priceForPeople).toBeCloseTo(115, 2) // Tours don't have extra guest fees
    expect(result.priceWithVat).toBeCloseTo(129.95, 2) // 115 * 1.13
    expect(result.total).toBeCloseTo(519.8, 2) // 129.95 * 4 guests (tours charge per guest)
  })

  test("falls back to default price when no base rate rule exists", () => {
    const noBaseRateRules: PricingRule[] = [
      {
        _id: "discount-only",
        title: "Discount Only",
        ruleType: "discount",
        percentage: 10,
        minimumNights: 7,
        description: "Discount only",
        language: "en",
        isActive: true,
      },
    ]

    const result = calculateEffectivePrice({
      pricingRules: noBaseRateRules,
      guests: 1,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBe(115) // Fallback price
    expect(result.appliedRules).toContain("Base rate")
  })

  test("returns empty result for no pricing rules", () => {
    const result = calculateEffectivePrice({
      pricingRules: [],
      guests: 1,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBe(115) // Fallback price
    expect(result.appliedRules).toContain("Base rate")
  })
})
