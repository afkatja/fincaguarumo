// Simple test script to verify the evaluation system
import { evaluateResponseForHallucinations } from "./src/lib/better-chatbot/config.ts"

async function testEvaluation() {
  console.log("Testing hallucination evaluation system...")

  // Mock data for testing
  const mockResponse =
    "Villa Bruno has AC, ocean views, and costs $100 per night. It's available next week."
  const mockToolOutputs = [
    {
      toolName: "calculatePrice",
      args: { checkIn: "2024-03-01", checkOut: "2024-03-03", guests: 2 },
      result: { total: 330, basePrice: 150, currency: "USD" },
    },
  ]
  const mockSanityData = {
    home: {
      capacity: { maxGuests: 4 },
      amenities: [{ title: "WiFi" }, { title: "Kitchen" }],
      features: [{ title: "Garden" }],
    },
    basePricing: { basePrice: 150 },
    paymentMethods: [{ title: "Stripe", methodType: "credit_card" }],
  }

  try {
    const evaluation = await evaluateResponseForHallucinations({
      response: mockResponse,
      toolOutputs: mockToolOutputs,
      sanityData: mockSanityData,
    })

    console.log("Evaluation result:", evaluation)
    console.log("✓ Evaluation system is working")
  } catch (error) {
    console.error("❌ Evaluation test failed:", error)
  }
}

testEvaluation()
