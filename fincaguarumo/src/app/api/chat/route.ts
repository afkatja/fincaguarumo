import {
  createChatStream,
  bookingTools,
  bookingAgentConfig,
} from "@/lib/better-chatbot/config"
import { checkAvailability } from "@/lib/tools/availability"
import { createBooking } from "@/lib/tools/booking"
import { getContextAwarePrompt } from "@/lib/better-chatbot/context-aware"

// Tool execution functions
const toolExecutors = {
  checkAvailability: async (args: any) => {
    return await checkAvailability(args)
  },
  createBooking: async (args: any) => {
    return await createBooking(args)
  },
  getPropertyInfo: async () => {
    return {
      name: "Villa Bruno",
      location: "Costa Rica",
      amenities: ["Pool", "Beautiful Views", "Modern Amenities"],
      languages: ["English", "Spanish", "German"],
    }
  },
}

export async function POST(request: Request) {
  try {
    const { messages, threadId, locale = "en", context } = await request.json()

    // Build context-aware system prompt
    let systemPrompt = bookingAgentConfig.systemPrompt
    if (context) {
      const contextPrompt = getContextAwarePrompt(context)
      systemPrompt = `${systemPrompt}\n\n${contextPrompt}`
    }

    // Create the chat stream with tool execution
    const result = await createChatStream({
      messages,
      threadId,
      tools: bookingTools,
      systemPrompt,
    })

    // Return the stream
    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
