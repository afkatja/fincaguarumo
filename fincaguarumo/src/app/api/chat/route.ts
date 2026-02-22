import {
  createChatStream,
  bookingTools,
  bookingAgentConfig,
  evaluateResponseForHallucinations,
} from "@/lib/better-chatbot/config"
import { getContextAwarePrompt } from "@/lib/better-chatbot/context-aware"
import { buildRAGContext } from "@/lib/rag-context-builder"
import { extractPropertyConfig } from "@/lib/sanity-data-extractor"
import { streamText } from "ai"

export async function POST(request: Request) {
  try {
    const { messages, threadId, locale = "en", context } = await request.json()

    // Get the last user message for RAG
    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage?.content || ""

    // Build RAG context from Sanity
    const ragContext = await buildRAGContext(userQuery, {
      page: context?.page || "homepage",
      slug: context?.propertySlug,
      locale,
    })

    // Get Sanity configuration data for evaluation
    const sanityData = await extractPropertyConfig()
    console.log("SANITY DATA", { sanityData })

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

    // Generate initial response with evaluation
    const result = await createChatStream({
      messages,
      threadId,
      tools: bookingTools,
      systemPrompt,
    })

    // Collect the full response and tool outputs for evaluation
    let fullResponse = ""
    let toolOutputs: any[] = []

    // Capture the complete response
    const response = result.toTextStreamResponse()
    const reader = response.body?.getReader()

    if (reader) {
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullResponse += chunk
      }
    }

    // Extract tool outputs from the result properly
    try {
      // For streamText, we need to collect tool results during streaming
      // or use the onFinish callback. Since we're already consuming the stream,
      // we'll capture tool results from the steps array
      const steps = await result.steps
      const allToolResults = steps.flatMap(
        (step: any) =>
          step.toolResults?.map((toolResult: any) => ({
            toolName: toolResult.toolCallId || toolResult.toolName,
            args: toolResult.args,
            result: toolResult.result,
          })) || [],
      )

      toolOutputs = allToolResults
      console.log("TOOL RESULTS", { toolOutputs })
    } catch (error) {
      console.warn("Could not extract tool outputs:", error)
      toolOutputs = []
    }

    // Evaluate the response for hallucinations
    const evaluation = await evaluateResponseForHallucinations({
      response: fullResponse,
      toolOutputs,
      sanityData,
    })

    // Log evaluation results
    console.log("Response evaluation:", {
      score: evaluation.score,
      isAccurate: evaluation.isAccurate,
      hallucinationsCount: evaluation.hallucinations?.length || 0,
    })

    let finalResponse = fullResponse
    let correctionsApplied = false

    // If score is below threshold or hallucinations detected, apply corrections
    if (
      evaluation.score < 8 ||
      !evaluation.isAccurate ||
      (evaluation.hallucinations && evaluation.hallucinations.length > 0)
    ) {
      console.warn("Low quality response detected, applying corrections:", {
        hallucinations: evaluation.hallucinations,
        corrections: evaluation.corrections,
      })

      // Apply corrections by improving the system prompt for next response
      if (evaluation.corrections && evaluation.corrections.length > 0) {
        try {
          // Convert corrections to system prompt improvements
          const correctionPrompt = `Based on recent response evaluation, add these specific constraints to prevent inaccuracies:

CORRECTIONS NEEDED:
${evaluation.corrections.map((correction: string, index: number) => `${index + 1}. ${correction}`).join("\n")}

UPDATED SYSTEM PROMPT RULES:
${systemPrompt}

ADDITIONAL CONSTRAINTS (must follow strictly):
- ${evaluation.corrections
            .map((correction: string) =>
              correction
                .replace(/^Remove /, "Do not mention ")
                .replace(/^Add /, "Always include ")
                .replace(/^Correct /, "Ensure accurate "),
            )
            .join("\n- ")}
- Double-check all factual claims against provided data
- Never invent amenities, features, or details not in ground truth
- Verify all pricing matches tool outputs exactly
- Only use information from the provided ground truth data

These constraints override any conflicting instructions in the original system prompt.`

          // Generate new response with improved system prompt
          const correctedResult = await createChatStream({
            messages,
            threadId,
            tools: bookingTools,
            systemPrompt: correctionPrompt,
          })

          // Capture the corrected response
          const correctedResponseText = correctedResult.toTextStreamResponse()
          const correctedReader = correctedResponseText.body?.getReader()

          if (correctedReader) {
            const decoder = new TextDecoder()
            let correctedText = ""
            while (true) {
              const { done, value } = await correctedReader.read()
              if (done) break
              const chunk = decoder.decode(value, { stream: true })
              correctedText += chunk
            }
            finalResponse = correctedText
            correctionsApplied = true
            console.log("Corrections applied via improved system prompt")
          }
        } catch (correctionError) {
          console.error(
            "Failed to apply corrections via system prompt:",
            correctionError,
          )
        }
      }
    }

    // Return the final response (original or corrected)
    return new Response(finalResponse, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-evaluation-score": evaluation.score.toString(),
        "x-evaluation-accurate": evaluation.isAccurate.toString(),
        "x-hallucinations-count": (
          evaluation.hallucinations?.length || 0
        ).toString(),
        "x-corrections-applied": correctionsApplied.toString(),
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
