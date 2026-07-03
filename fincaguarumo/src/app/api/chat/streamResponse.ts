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
import { isChatbotEnabled } from "../../../lib/featureFlags"

function isMeaningfulRAGContext(ragContext: string): boolean {
  return (
    !!ragContext &&
    ragContext.trim().length > 0 &&
    !ragContext.includes("No specific information found") &&
    !ragContext.includes("Please provide general assistance") &&
    !ragContext.includes("=== GENERAL INFORMATION ===")
  )
}

async function buildRAGContextForQuery(
  userQuery: string,
  context?: ContextAwareChatContext,
  locale: string = "en",
  writer?: WritableStreamDefaultWriter<Uint8Array>,
): Promise<string> {
  console.log("🔍 Starting RAG context building for query:", userQuery)

  const bypassRAG = userQuery.includes("test") || userQuery.includes("bypass")
  if (bypassRAG) {
    console.log("🔄 Bypassing RAG context for testing")
    return ""
  }

  try {
    const ragContext = await buildRAGContext(userQuery, {
      page: context?.page || "homepage",
      slug: (context as any)?.propertySlug,
      locale,
    })
    console.log("✅ RAG context built successfully, length:", ragContext.length)
    console.log(
      "📄 RAG context preview:",
      ragContext.substring(0, 200) + (ragContext.length > 200 ? "..." : ""),
    )
    return ragContext
  } catch (ragError) {
    console.error("❌ RAG context building failed:", ragError)
    if (writer) {
      const errorPayload = JSON.stringify({
        type: "progress",
        message:
          "Having trouble accessing property database. I'll help you with general information.",
      })
      await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
    }
    return ""
  }
}

function buildSystemPrompt(
  ragContext: string,
  context?: ContextAwareChatContext,
  sanityData?: any,
): string {
  let systemPrompt = bookingAgentConfig.systemPrompt

  if (context) {
    const contextPrompt = getContextAwarePrompt(context)
    systemPrompt = `${systemPrompt}\n\n${contextPrompt}`
  }

  const hasMeaningfulContext = isMeaningfulRAGContext(ragContext)
  console.log("🤔 Has meaningful RAG context:", hasMeaningfulContext)

  if (hasMeaningfulContext) {
    systemPrompt = `${systemPrompt}\n\n=== RELEVANT INFORMATION FROM OUR DATABASE ===\n${ragContext}\n\nIMPORTANT: Use ONLY the information provided above to answer the user's question. Do NOT add details from general knowledge or make assumptions about features not explicitly mentioned in the context. If specific information is missing, acknowledge what you don't know rather than guessing.`
  } else {
    console.log(
      "🔄 No meaningful RAG context found, adding fallback instruction",
    )
    systemPrompt = `${systemPrompt}\n\n=== CONTEXT ===\nThe user asked a general or vague question that didn't match specific information in our database. Please provide a helpful, general response about Villa Bruno and Finca Guarumo. If you don't have specific information, acknowledge this and suggest what information you can help with.`
  }

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

  return systemPrompt
}

async function sendRAGContextToUI(
  ragContext: string,
  userQuery: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
): Promise<void> {
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
}

async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array> | null,
  writer: WritableStreamDefaultWriter<Uint8Array>,
): Promise<string> {
  let fullResponse = ""

  if (!reader) {
    console.error("❌ No reader available from AI response")
    return fullResponse
  }

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

      if (chunk.trim()) {
        const formattedChunk = `1:${chunk}\n`
        await writer.write(new TextEncoder().encode(formattedChunk))
      }
    }
    console.log(`✅ Stream processing completed, total chunks: ${chunkCount}`)
  } catch (streamError) {
    console.error("❌ AI stream processing error:", streamError)
    const errorPayload = JSON.stringify({
      type: "progress",
      message: "Response was interrupted. Please try again.",
    })
    await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
  } finally {
    console.log("🔒 Closing writer after stream processing")
    await writer.close()
  }

  return fullResponse
}

async function extractToolOutputs(result: any): Promise<ToolOutput[]> {
  try {
    const steps = await result.steps
    return steps.flatMap((step: any) => {
      if (
        (step.finishReason === "tool-calls" || step.type === "tool-calls") &&
        step.content
      ) {
        return step.content
          .filter((item: any) => item.type === "tool-result")
          .map(
            (item: any): ToolOutput => ({
              toolName: item.toolName,
              args: item.input,
              result: item.output,
            }),
          )
      }
      return []
    })
  } catch (error) {
    console.warn("Could not extract tool outputs:", error)
    return []
  }
}

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
    // Check if chatbot feature is enabled
    if (!isChatbotEnabled()) {
      const errorPayload = JSON.stringify({
        type: "error",
        message: "Chatbot feature is not available",
      })
      await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
      await writer.close()
      return
    }
    const detectedIntent: UserIntent = userIntent || detectUserIntent(userQuery)
    console.log("Using intent for tool filtering:", detectedIntent)

    const sanityData = await extractPropertyConfig()

    const ragContext = await buildRAGContextForQuery(
      userQuery,
      context,
      locale,
      writer,
    )
    const systemPrompt = buildSystemPrompt(ragContext, context, sanityData)

    if (isMeaningfulRAGContext(ragContext)) {
      await sendRAGContextToUI(ragContext, userQuery, writer)
    }

    const relevantTools = filterToolsByIntent(detectedIntent)
    console.log("Using filtered tools:", Object.keys(relevantTools))

    // Create AbortController for timeout handling
    const controller = new AbortController()
    let isClosed = false

    // Helper to ensure writer is only closed once
    const closeOnce = async () => {
      if (isClosed) return
      isClosed = true
      try {
        await writer.close()
        console.log("🔒 Stream writer closed successfully")
      } catch (closeError) {
        // Swallow InvalidStateError and other close errors
        if (
          !(
            closeError instanceof Error &&
            closeError.message.includes("InvalidStateError")
          )
        ) {
          console.error("❌ Unexpected error closing stream:", closeError)
        }
      }
    }

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

      // Check if we have meaningful RAG context to provide as fallback
      if (isMeaningfulRAGContext(ragContext)) {
        console.log("🔄 Using RAG context fallback due to AI model failure")
        const fallbackPayload = JSON.stringify({
          type: "text",
          content: `I found some relevant information from our knowledge base to help answer your question:\n\n${ragContext}`,
        })
        await writer.write(new TextEncoder().encode(`0:${fallbackPayload}\n`))
        await writer.close()
        return
      }

      // Generic fallback when no meaningful RAG context
      const errorPayload = JSON.stringify({
        type: "progress",
        message:
          "I'm having trouble generating a response right now. Please try again in a moment or contact our support team for assistance.",
      })
      await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
      await closeOnce()
      return
    }

    const response = result.toTextStreamResponse()
    const reader = response.body?.getReader() ?? null

    // Process the stream and send AI chunks immediately

    // Start stream processing in background with timeout
    console.log("⏰ Setting up 30-second timeout for stream processing")
    const streamTimeout = setTimeout(async () => {
      console.error("⏰ Stream processing timeout - no response received")
      try {
        // Abort the upstream stream
        controller.abort()

        // Cancel the reader if available
        if (reader) {
          try {
            await reader.cancel()
            console.log("📖 Reader cancelled due to timeout")
          } catch (cancelError) {
            console.error("❌ Error cancelling reader:", cancelError)
          }
        }

        const timeoutPayload = JSON.stringify({
          type: "progress",
          message: "Request is taking longer than expected. Please try again.",
        })
        await writer.write(new TextEncoder().encode(`0:${timeoutPayload}\n`))
        await closeOnce()
        console.log("🔒 Stream closed due to timeout")
      } catch (closeError) {
        console.error("❌ Error closing stream after timeout:", closeError)
      }
    }, 30000)

    console.log("🚀 Starting background stream processing")
    const fullResponse = await processStream(reader, writer)
      .catch(error => {
        console.error("❌ Background stream processing error:", error)
        return ""
      })
      .finally(() => {
        console.log(
          "✅ Background stream processing completed, clearing timeout",
        )
        clearTimeout(streamTimeout)
      })

    const toolOutputs = await extractToolOutputs(result)

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
    try {
      const errorPayload = JSON.stringify({
        type: "error",
        message: "Failed to process chat request",
      })
      await writer.write(new TextEncoder().encode(`0:${errorPayload}\n`))
      await writer.close()
    } catch (writeError) {
      console.error("Failed to write error to stream:", writeError)
    }
  }
}
