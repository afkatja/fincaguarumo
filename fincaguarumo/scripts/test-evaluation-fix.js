// Test script to verify evaluation fixes
// This simulates the problematic query scenario

const testCases = [
  {
    name: "Problematic Query: March 17th availability",
    userQuery: "is there availability for 2 nights on march 17th for 2 people",
    mockResponse:
      "Villa Bruno welcomes guests of all ages! There are no specific discounts for children, as the pricing is based on the total number of guests. The property accommodates up to 4 guests total, with a base price of $129 per night. For each additional guest beyond 1, there is a $20 per night fee.\n\nTo confirm availability for March 17th for 2 nights and 2 guests, I'll check the dates for you. While I do that, here's what you can expect for pricing if the dates are available:\n\nBase price: $129 per night\nExtra guest fee: $20 per night (for the second guest)\nVAT: 13% added to the final price\nDiscounts may apply for stays of 7+ nights (13% off) or 28+ nights (33% off), but these won't apply for a 2-night stay.",
    toolOutputs: [
      {
        toolName: "checkAvailability",
        args: { checkIn: "2026-03-17", checkOut: "2026-03-19" },
        result: { error: "Failed to check availability", isAvailable: false },
      },
    ],
    sanityData: {
      property: { capacity: 4, basePrice: 129 },
      pricingRules: [],
    },
    expectedIssues: [
      "Response does not address the user's availability question directly",
      "Provides generic information instead of acknowledging tool failure",
      "Answers about children discounts when user asked about availability",
    ],
  },
  {
    name: "Good Response: Acknowledges tool failure",
    userQuery: "is there availability for 2 nights on march 17th for 2 people",
    mockResponse:
      "I apologize, but I'm currently unable to check availability for March 17th-19th, 2026 due to a technical issue with our booking system. Please try again in a few moments, or contact us directly at +506-87495341 or info@fincaguarumo.com for immediate assistance with checking availability for 2 guests.",
    toolOutputs: [
      {
        toolName: "checkAvailability",
        args: { checkIn: "2026-03-17", checkOut: "2026-03-19" },
        result: { error: "Failed to check availability", isAvailable: false },
      },
    ],
    sanityData: {
      property: { capacity: 4, basePrice: 129 },
      pricingRules: [],
    },
    expectedScore: 8,
  },
]

console.log("=== Evaluation Fix Test ===\n")

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`)
  console.log(`User Query: "${test.userQuery}"`)
  console.log(`Response Length: ${test.mockResponse.length} chars`)
  console.log(`Tool Outputs: ${JSON.stringify(test.toolOutputs, null, 2)}`)

  if (test.expectedIssues) {
    console.log("Expected Issues:")
    test.expectedIssues.forEach(issue => console.log(`  - ${issue}`))
  }

  if (test.expectedScore) {
    console.log(`Expected Score: ${test.expectedScore}/10`)
  }

  console.log("\n" + "=".repeat(50) + "\n")
})

console.log("To run the actual evaluation test:")
console.log("1. Start development server: npm run dev")
console.log("2. Make a POST request to /api/chat with test data")
console.log("3. Check the evaluation headers in the response")
console.log("\nExpected improvements:")
console.log(
  "- x-evaluation-relevant should be 'false' for the problematic response",
)
console.log("- x-evaluation-score should be < 7 for the problematic response")
console.log(
  "- x-corrections-applied should be 'true' for the problematic response",
)
console.log("- The corrected response should address availability directly")
console.log(
  "- The evaluation model now has access to contact info: +506-87495341, info@fincaguarumo.com",
)
console.log("\nContact Information Added to Evaluation Context:")
console.log("- Phone: +506-87495341")
console.log("- Email: info@fincaguarumo.com")
console.log("- Website: https://fincaguarumo.com")
