import {
  createChatStream,
  bookingTools,
  bookingAgentConfig,
  filterToolsByIntent,
} from "@/lib/better-chatbot/config"
import { getContextAwarePrompt } from "@/lib/better-chatbot/context-aware"
import { buildRAGContext } from "@/lib/rag-context-builder"
import { extractPropertyConfig } from "@/lib/sanity-data-extractor"
import { isCriticalFlow, performBackgroundEvaluation } from "./evaluation"
import { detectUserIntent, UserIntent } from "../../../lib/intent-detection"
import { ChatMessage, ToolOutput } from "../../../types"
import { ChatContext as ContextAwareChatContext } from "../../../lib/better-chatbot/context-aware"

export const streamResponseWithData = async ({
  userQuery,
  context,
  locale,
  messages,
  threadId,
  writer,
  userIntent,
}: {
  userQuery: string
  context?: ContextAwareChatContext
  locale: string
  messages: ChatMessage[]
  threadId?: string
  writer: WritableStreamDefaultWriter<Uint8Array>
  userIntent?: UserIntent
}) => {
  try {
    // Use the passed user intent or detect it if not provided
    const detectedIntent: UserIntent = userIntent || detectUserIntent(userQuery)
    console.log("Using intent for tool filtering:", detectedIntent)
    // Get Sanity configuration data once and pass as context
    const sanityData = await extractPropertyConfig()
    // console.log("SANITY DATA", { sanityData })

    // Build RAG context from Sanity
    const ragContext = await buildRAGContext(userQuery, {
      page: context?.page || "homepage",
      slug: (context as any)?.propertySlug,
      locale,
    })

    // Build context-aware system prompt
    let systemPrompt = bookingAgentConfig.systemPrompt
    if (context) {
      const contextPrompt = getContextAwarePrompt(context)
      systemPrompt = `${systemPrompt}\n\n${contextPrompt}`
    }

    // Add RAG context to system prompt
    if (ragContext) {
      systemPrompt = `${systemPrompt}\n\n=== RELEVANT INFORMATION FROM OUR DATABASE ===\n${ragContext}\n\nUse this information to answer the user's question accurately. If the information doesn't fully answer their question, you can still provide helpful guidance based on your general knowledge.`
    }

    // Add preloaded Sanity data to system prompt to avoid repeated tool calls
    if (sanityData) {
      const sanityContext = `
=== PRELOADED PROPERTY DATA ===
Property: ${sanityData.property?.name || "Villa Bruno"}
Capacity: ${sanityData.property?.capacity || 4} guests
Base Price: $${sanityData.basePricing?.basePrice || 150} per night
Payment Methods: ${sanityData.property?.paymentMethods?.map((m: any) => m.title).join(", ") || "Stripe"}
Cancellation Policy: ${sanityData.property?.cancellationPolicy?.description || "Free up to 14 days before arrival"}
Amenities: ${
        sanityData.property?.amenities
          ?.map((a: any) => a.title)
          .slice(0, 5)
          .join(", ") || "Standard amenities"
      }

Use this preloaded data instead of calling tools for basic property information.`
      systemPrompt = `${systemPrompt}\n\n${sanityContext}`
    }

    // Generate initial response with progress indicators
    // Filter tools based on detected intent for more efficient processing
    const relevantTools = filterToolsByIntent(detectedIntent)
    console.log("Using filtered tools:", Object.keys(relevantTools))

    const result = await createChatStream({
      messages,
      threadId,
      tools: relevantTools,
      systemPrompt,
    })

    const response = result.toTextStreamResponse()
    const reader = response.body?.getReader()

    let fullResponse = ""
    let toolOutputs: ToolOutput[] = []

    // Process the stream and forward AI chunks
    const processStream = async () => {
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value, { stream: true })
            fullResponse += chunk

            // Forward the original AI SDK chunks (they use different event IDs)
            await writer.write(value)
          }
        } finally {
          // Only close writer after AI stream is completely done
          await writer.close()
        }
      }
    }

    // Start stream processing in background
    processStream().catch(error => {
      console.error("Stream processing error:", error)
    })

    // Extract tool outputs from the result properly
    try {
      // For streamText, we need to collect tool results during streaming
      // or use the onFinish callback. Since we're already consuming the stream,
      // we'll capture tool results from the steps array
      const steps = await result.steps
      toolOutputs = steps.flatMap((step: any) => {
        // console.log("Processing step:", {
        //   type: step.type,
        //   finishReason: step.finishReason,
        //   stepKeys: Object.keys(step),
        // })

        // Handle tool-result steps
        if (
          (step.finishReason === "tool-calls" || step.type === "tool-calls") &&
          step.content
        ) {
          // console.log("Found tool-calls step with content:", step.content)
          return step.content
            .filter((item: any) => item.type === "tool-result")
            .map(
              (item: any): ToolOutput => ({
                toolName: item.toolName,
                args: item.input, // The args are in the input property
                result: item.output, // The result is directly in the output property
              }),
            )
        }

        return []
      })
      // console.log("TOOL RESULTS", { toolOutputs })
    } catch (error) {
      console.warn("Could not extract tool outputs:", error)
      toolOutputs = []
    }

    // Perform evaluation in background only for critical flows
    if (isCriticalFlow(userQuery)) {
      console.log("Critical flow detected - performing background evaluation")
      performBackgroundEvaluation(
        fullResponse,
        toolOutputs,
        sanityData,
        messages,
        context || { page: "homepage", locale },
        systemPrompt,
        threadId,
        userQuery,
      )
    } else {
      console.log("General Q&A detected - skipping evaluation for speed")
    }
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
