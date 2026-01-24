import { Mistral } from "@mistralai/mistralai"

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! })

export const bookingAgent = {
  name: "Booking Assistant",
  description: "Helps users book Villa Bruno",
  instructions: {
    systemPrompt: `
      You are a helpful booking assistant for Villa Bruno.
      Your tasks:
      1. Guide users through the booking process
      2. Answer questions about the property
      3. Check availability
      4. Provide booking confirmation
      
      Always be friendly and helpful.
      Use tools when appropriate.
      Never share personal information.
    `,
    tools: ["check_availability", "create_booking"],
  },
  client,
}
