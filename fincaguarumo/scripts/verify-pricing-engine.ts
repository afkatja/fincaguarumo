#!/usr/bin/env tsx

import { calculateEffectivePrice, PricingRule } from "../src/lib/pricingEngine"
import { BOOKING_TYPE } from "../src/types"

// Mock pricing rules that include discount rules
const mockPricingRules: PricingRule[] = [
  {
    _id: "base-rate-1",
    title: "Standard Base Rate",
    ruleType: "base_rate",
    basePrice: 89,
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

// Test pricing rules without discounts (to verify no hardcoded fallback)
const pricingRulesWithoutDiscounts: PricingRule[] = [
  {
    _id: "base-rate-1",
    title: "Standard Base Rate",
    ruleType: "base_rate",
    basePrice: 89,
    description: "Standard base rate",
    language: "en",
    isActive: true,
  },
]

function runTests() {
  console.log("🧮 Testing Pricing Engine Migration\n")

  // Test 1: Base case - 1 guest, 1 night
  const result1 = calculateEffectivePrice({
    pricingRules: mockPricingRules,
    guests: 1,
    duration: 1,
    checkInDate: undefined,
    bookingType: BOOKING_TYPE.villa,
  })
  console.log("Test 1 - 1 guest, 1 night:")
  console.log(`  Base Price: $${result1.basePrice}`)
  console.log(`  Price for People: $${result1.priceForPeople}`)
  console.log(`  Price with VAT: $${result1.priceWithVat.toFixed(2)}`)
  console.log(`  Total: $${result1.total.toFixed(2)}`)
  console.log(`  Applied Rules: ${result1.appliedRules.join(", ")}\n`)

  // Test 2: Multiple guests
  const result2 = calculateEffectivePrice({
    pricingRules: mockPricingRules,
    guests: 3,
    duration: 1,
    checkInDate: undefined,
    bookingType: BOOKING_TYPE.villa,
  })
  console.log("Test 2 - 3 guests, 1 night:")
  console.log(`  Base Price: $${result2.basePrice}`)
  console.log(`  Price for People: $${result2.priceForPeople}`)
  console.log(`  Price with VAT: $${result2.priceWithVat.toFixed(2)}`)
  console.log(`  Total: $${result2.total.toFixed(2)}`)
  console.log(`  Applied Rules: ${result2.appliedRules.join(", ")}\n`)

  // Test 3: Weekly stay
  const result3 = calculateEffectivePrice({
    pricingRules: mockPricingRules,
    guests: 2,
    duration: 7,
    checkInDate: undefined,
    bookingType: BOOKING_TYPE.villa,
  })
  console.log("Test 3 - 2 guests, 7 nights:")
  console.log(`  Base Price: $${result3.basePrice.toFixed(2)}`)
  console.log(`  Price for People: $${result3.priceForPeople.toFixed(2)}`)
  console.log(`  Price with VAT: $${result3.priceWithVat.toFixed(2)}`)
  console.log(`  Total: $${result3.total.toFixed(2)}`)
  console.log(`  Applied Rules: ${result3.appliedRules.join(", ")}\n`)

  // Test 4: Monthly stay
  const result4 = calculateEffectivePrice({
    pricingRules: mockPricingRules,
    guests: 1,
    duration: 28,
    checkInDate: undefined,
    bookingType: BOOKING_TYPE.villa,
  })
  console.log("Test 4 - 1 guest, 28 nights:")
  console.log(`  Base Price: $${result4.basePrice.toFixed(2)}`)
  console.log(`  Price for People: $${result4.priceForPeople.toFixed(2)}`)
  console.log(`  Price with VAT: $${result4.priceWithVat.toFixed(2)}`)
  console.log(`  Total: $${result4.total.toFixed(2)}`)
  console.log(`  Applied Rules: ${result4.appliedRules.join(", ")}\n`)

  // Test 5: Tour booking - simplified pricing: basePrice * guests + VAT
  const result5 = calculateEffectivePrice({
    pricingRules: mockPricingRules,
    guests: 4,
    duration: 1,
    checkInDate: undefined,
    bookingType: BOOKING_TYPE.tour,
  })
  console.log("Test 5 - 4 guests, tour booking:")
  console.log(`  Base Price: $${result5.basePrice}`)
  console.log(`  Price for People: $${result5.priceForPeople}`)
  console.log(`  Price with VAT: $${result5.priceWithVat.toFixed(2)}`)
  console.log(`  Total: $${result5.total.toFixed(2)}`)
  console.log(`  Applied Rules: ${result5.appliedRules.join(", ")}\n`)

  // Test 6: No discount rules - should apply no discounts
  const result6 = calculateEffectivePrice({
    pricingRules: pricingRulesWithoutDiscounts,
    guests: 1,
    duration: 7,
    checkInDate: undefined,
    bookingType: BOOKING_TYPE.villa,
  })
  console.log("Test 6 - 1 guest, 7 nights, NO discount rules:")
  console.log(`  Base Price: $${result6.basePrice}`)
  console.log(`  Price for People: $${result6.priceForPeople}`)
  console.log(`  Price with VAT: $${result6.priceWithVat.toFixed(2)}`)
  console.log(`  Total: $${result6.total.toFixed(2)}`)
  console.log(`  Applied Rules: ${result6.appliedRules.join(", ")}\n`)

  // Verify results match expected values
  const expectedResults = [
    { test: "Base case", expected: 100.57, actual: result1.total },
    { test: "3 guests", expected: 145.77, actual: result2.total },
    { test: "Weekly stay", expected: 770.7, actual: result3.total },
    { test: "Monthly stay", expected: 1886.64, actual: result4.total },
    { test: "Tour booking", expected: 402.28, actual: result5.total }, // 89 * 1.13 * 4 = 402.28
    { test: "No discounts (7 nights)", expected: 704.0, actual: result6.total }, // 89 * 1.13 * 7 = 704.0 (no discount)
  ]

  console.log("📊 Verification Results:")
  let allPassed = true
  expectedResults.forEach(({ test, expected, actual }) => {
    const passed = Math.abs(actual - expected) < 0.01
    console.log(
      `  ${test}: ${passed ? "✅ PASS" : "❌ FAIL"} (Expected: $${expected.toFixed(2)}, Got: $${actual.toFixed(2)})`,
    )
    if (!passed) allPassed = false
  })

  console.log(
    `\n${allPassed ? "🎉 All tests passed! Pricing engine working correctly." : "⚠️  Some tests failed. Please review the implementation."}`,
  )

  if (allPassed) {
    console.log("\n✅ Migration Summary:")
    console.log(
      "  - Pricing engine successfully replaces hardcoded price logic",
    )
    console.log("  - All existing calculations preserved (VAT, guest fees)")
    console.log("  - Discounts now come exclusively from pricingRules")
    console.log("  - No hardcoded fallback discounts applied")
    console.log("  - Ready for dynamic pricingRules from Sanity CMS")
    console.log("  - Backward compatibility maintained")
  }
}

runTests()
