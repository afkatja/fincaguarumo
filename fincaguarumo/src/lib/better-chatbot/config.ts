import { createMistral } from "@ai-sdk/mistral"
import { streamText } from "ai"

// Initialize Mistral client
const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
})

// Booking-specific agent configuration
export const bookingAgentConfig = {
  name: "Booking Assistant",
  description: "Helps users book Villa Bruno",
  systemPrompt: `You are a helpful booking assistant for Villa Bruno, a beautiful vacation rental property in Costa Rica.

Your tasks:
1. Guide users through the booking process step by step
2. Answer questions about the property, amenities, and location
3. Check availability for specific dates
4. Provide booking confirmation details
5. Help with payment and cancellation policies
6. Offer personalized recommendations based on user preferences

Property Information:
- Villa Bruno is located in Costa Rica
- Features include: beautiful views, modern amenities, pool, etc.
- Multiple languages supported: English, Spanish, German

Guidelines:
- Always be friendly, helpful, and professional
- Use tools when appropriate to check availability or create bookings
- Never share personal information or sensitive data
- If you don't know something, be honest and offer to connect with human support
- Adapt your responses based on the user's language preference
- Provide clear, concise information

When checking availability:
- Ask for check-in and check-out dates
- Verify the dates are valid (check-out must be after check-in)
- Provide clear availability status

When helping with booking:
- Collect necessary information: dates, guest count, contact details
- Explain the booking process clearly
- Provide confirmation details once booking is complete

Always maintain a warm, welcoming tone that reflects the hospitality of Villa Bruno.`,

  model: "mistral-large-latest",
  temperature: 0.7,
  maxTokens: 1000,
}

// Tool definitions for the booking agent
export const bookingTools = {
  checkAvailability: {
    description: "Check availability for specific dates",
    parameters: {
      type: "object",
      properties: {
        checkIn: {
          type: "string",
          description: "Check-in date in YYYY-MM-DD format",
        },
        checkOut: {
          type: "string",
          description: "Check-out date in YYYY-MM-DD format",
        },
      },
      required: ["checkIn", "checkOut"],
    },
  },
  createBooking: {
    description: "Create a new booking",
    parameters: {
      type: "object",
      properties: {
        checkIn: {
          type: "string",
          description: "Check-in date in YYYY-MM-DD format",
        },
        checkOut: {
          type: "string",
          description: "Check-out date in YYYY-MM-DD format",
        },
        guests: {
          type: "number",
          description: "Number of guests",
        },
        name: {
          type: "string",
          description: "Guest name",
        },
        email: {
          type: "string",
          description: "Guest email",
        },
        phone: {
          type: "string",
          description: "Guest phone number",
        },
      },
      required: ["checkIn", "checkOut", "guests", "name", "email"],
    },
  },
  getPropertyInfo: {
    description: "Get information about Villa Bruno property",
    parameters: {
      type: "object",
      properties: {},
    },
  },
}

// Function to create a streaming chat response
export async function createChatStream({
  messages,
  threadId,
  tools = bookingTools,
  model = bookingAgentConfig.model,
  systemPrompt = bookingAgentConfig.systemPrompt,
}: {
  messages: any[]
  threadId?: string
  tools?: any
  model?: string
  systemPrompt?: string
}) {
  return streamText({
    model: mistral(model),
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    tools,
    temperature: bookingAgentConfig.temperature,
  })
}

// Multi-language support
export const languagePrompts = {
  en: {
    greeting: "Hello! How can I help you book Villa Bruno today?",
    assistance: "I'm here to assist you with your booking.",
    availability: "Let me check the availability for those dates.",
    confirmation: "Great! I'll help you complete your booking.",
  },
  es: {
    greeting: "¡Hola! ¿Cómo puedo ayudarte a reservar Villa Bruno hoy?",
    assistance: "Estoy aquí para ayudarte con tu reserva.",
    availability: "Déjame verificar la disponibilidad para esas fechas.",
    confirmation: "¡Excelente! Te ayudaré a completar tu reserva.",
  },
  de: {
    greeting:
      "Hallo! Wie kann ich Ihnen heute bei der Buchung von Villa Bruno helfen?",
    assistance: "Ich bin hier, um Ihnen bei Ihrer Buchung zu helfen.",
    availability: "Lassen Sie mich die Verfügbarkeit für diese Daten prüfen.",
    confirmation: "Toll! Ich helfe Ihnen, Ihre Buchung abzuschließen.",
  },
}

export function getLanguagePrompt(
  locale: string,
  key: keyof typeof languagePrompts.en,
): string {
  const lang = locale as keyof typeof languagePrompts
  return languagePrompts[lang]?.[key] || languagePrompts.en[key]
}
