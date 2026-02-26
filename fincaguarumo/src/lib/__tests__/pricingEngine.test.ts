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
    expect(result.priceWithVat).toBeCloseTo(130.05, 2) // 115 * 1.13
    expect(result.total).toBeCloseTo(130.05, 2) // 130.05 * 1 night
  })

  test("calculates price for multiple guests with extra guest fees", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 3,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBe(89)
    expect(result.priceForPeople).toBe(129) // 89 + 2 * 20 (extra guest fees)
    expect(result.priceWithVat).toBeCloseTo(145.77, 2) // 129 * 1.13
    expect(result.total).toBeCloseTo(145.77, 2)
  })

  test("applies weekly discount for 7+ nights", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 2,
      duration: 7,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBeCloseTo(77.43, 2) // 89 * 0.87 (13% discount)
    expect(result.priceForPeople).toBeCloseTo(97.43, 2) // 77.43 + 20 (1 extra guest)
    expect(result.priceWithVat).toBeCloseTo(110.1, 2) // 97.43 * 1.13
    expect(result.total).toBeCloseTo(770.7, 2) // 110.10 * 7 nights
  })

  test("applies monthly discount for 28+ nights", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 1,
      duration: 28,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.villa,
    })

    expect(result.basePrice).toBeCloseTo(59.63, 2) // 89 * 0.67 (33% discount)
    expect(result.priceForPeople).toBeCloseTo(59.63, 2) // No extra guest fee
    expect(result.priceWithVat).toBeCloseTo(67.38, 2) // 59.63 * 1.13
    expect(result.total).toBeCloseTo(1886.64, 2) // 67.38 * 28 nights
  })

  test("handles tour booking type correctly", () => {
    const result = calculateEffectivePrice({
      pricingRules: mockPricingRules,
      guests: 4,
      duration: 1,
      checkInDate: undefined,
      bookingType: BOOKING_TYPE.tour,
    })

    expect(result.basePrice).toBe(89)
    expect(result.priceForPeople).toBeCloseTo(149, 2) // 89 + 3 * 20 (max 3 extra guests)
    expect(result.priceWithVat).toBeCloseTo(168.37, 2) // 149 * 1.13
    expect(result.total).toBeCloseTo(673.48, 2) // 168.37 * 4 guests (tours charge per guest)
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

    expect(result.basePrice).toBe(89) // Fallback price
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

    expect(result.basePrice).toBe(89) // Fallback price
    expect(result.appliedRules).toContain("Base rate")
  })
})
