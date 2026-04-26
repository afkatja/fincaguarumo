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
    let ragContext = ""
    console.log("🔍 Starting RAG context building for query:", userQuery)

    // TEMPORARY DEBUG: Bypass RAG to test AI stream
    const bypassRAG = userQuery.includes("test") || userQuery.includes("bypass")
    if (bypassRAG) {
      console.log("🔄 Bypassing RAG context for testing")
      ragContext = ""
    } else {
      try {
        ragContext = await buildRAGContext(userQuery, {
          page: context?.page || "homepage",
          slug: (context as any)?.propertySlug,
          locale,
        })
        console.log(
          "✅ RAG context built successfully, length:",
          ragContext.length,
        )
        console.log(
          "📄 RAG context preview:",
          ragContext.substring(0, 200) + (ragContext.length > 200 ? "..." : ""),
        )
      } catch (ragError) {
        console.error("❌ RAG context building failed:", ragError)
        // Send error to user and continue without RAG context
        const errorPayload = JSON.stringify({
          type: "progress",
          message:
            "Having trouble accessing property database. I'll help you with general information.",
        })
        await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
        ragContext = ""
      }
    }

    // Build context-aware system prompt
    let systemPrompt = bookingAgentConfig.systemPrompt
    if (context) {
      const contextPrompt = getContextAwarePrompt(context)
      systemPrompt = `${systemPrompt}\n\n${contextPrompt}`
    }

    // Check if RAG context is meaningful
    const hasMeaningfulContext =
      ragContext &&
      ragContext.trim().length > 0 &&
      !ragContext.includes("No specific information found") &&
      !ragContext.includes("Please provide general assistance") &&
      !ragContext.includes("=== GENERAL INFORMATION ===")

    console.log("🤔 Has meaningful RAG context:", hasMeaningfulContext)

    // Add RAG context to system prompt
    if (hasMeaningfulContext) {
      systemPrompt = `${systemPrompt}\n\n=== RELEVANT INFORMATION FROM OUR DATABASE ===\n${ragContext}\n\nIMPORTANT: Use ONLY the information provided above to answer the user's question. Do NOT add details from general knowledge or make assumptions about features not explicitly mentioned in the context. If specific information is missing, acknowledge what you don't know rather than guessing.`

      // Send RAG context to UI for display
      try {
        const ragPayload = JSON.stringify({
          type: "rag-context",
          context: ragContext,
          metadata: {
            timestamp: new Date().toISOString(),
            query: userQuery,
          },
        })
        await writer.write(new TextEncoder().encode(`0:${ragPayload}\n`))
      } catch (error) {
        console.warn("Failed to send RAG context to UI:", error)
      }
    } else {
      // Add fallback instruction when no meaningful context is found
      console.log(
        "🔄 No meaningful RAG context found, adding fallback instruction",
      )
      systemPrompt = `${systemPrompt}\n\n=== CONTEXT ===\nThe user asked a general or vague question that didn't match specific information in our database. Please provide a helpful, general response about Villa Bruno and Finca Guarumo. If you don't have specific information, acknowledge this and suggest what information you can help with.`

      // No fallback message needed - the UI will show a loading spinner
      console.log(
        "🔄 No meaningful RAG context found, proceeding with general response",
      )
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

    let result
    console.log(
      "🤖 Starting AI chat stream creation with tools:",
      Object.keys(relevantTools),
    )
    try {
      result = await createChatStream({
        messages,
        threadId,
        tools: relevantTools,
        systemPrompt,
      })
      console.log("✅ AI chat stream created successfully")
    } catch (aiError) {
      console.error("❌ AI chat stream creation failed:", aiError)
      // Send error message and close stream
      const errorPayload = JSON.stringify({
        type: "progress",
        message:
          "I'm having trouble generating a response. Please try again in a moment.",
      })
      await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
      await writer.close()
      return
    }

    const response = result.toTextStreamResponse()
    const reader = response.body?.getReader()

    let fullResponse = ""
    let toolOutputs: ToolOutput[] = []

    // Process the stream and send AI chunks immediately
    const processStream = async () => {
      if (reader) {
        console.log("📖 Starting stream processing, reader available")
        try {
          let chunkCount = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log("✅ Stream reading completed, done:", done)
              break
            }

            const chunk = new TextDecoder().decode(value, { stream: true })
            fullResponse += chunk
            chunkCount++

            // Send each chunk immediately for streaming effect
            if (chunk.trim()) {
              const formattedChunk = `1:${chunk}\n`
              await writer.write(new TextEncoder().encode(formattedChunk))
            }
          }
          console.log(
            `✅ Stream processing completed, total chunks: ${chunkCount}`,
          )
        } catch (streamError) {
          console.error("❌ AI stream processing error:", streamError)
          // Send error message to user
          const errorPayload = JSON.stringify({
            type: "progress",
            message: "Response was interrupted. Please try again.",
          })
          await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
        } finally {
          console.log("🔒 Closing writer after stream processing")
          // Only close writer after AI stream is completely done
          await writer.close()
        }
      } else {
        console.error("❌ No reader available from AI response")
      }
    }

    // Start stream processing in background with timeout
    console.log("⏰ Setting up 30-second timeout for stream processing")
    const streamTimeout = setTimeout(async () => {
      console.error("⏰ Stream processing timeout - no response received")
      try {
        const timeoutPayload = JSON.stringify({
          type: "progress",
          message: "Request is taking longer than expected. Please try again.",
        })
        await writer.write(new TextEncoder().encode(`0:${timeoutPayload}\n`))
        await writer.close()
        console.log("🔒 Stream closed due to timeout")
      } catch (closeError) {
        console.error("❌ Error closing stream after timeout:", closeError)
      }
    }, 30000) // 30 second timeout

    console.log("🚀 Starting background stream processing")
    processStream()
      .catch(error => {
        console.error("❌ Background stream processing error:", error)
      })
      .finally(() => {
        console.log(
          "✅ Background stream processing completed, clearing timeout",
        )
        clearTimeout(streamTimeout)
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
