import { introspectionModeEvaluation } from "../../../lib/better-chatbot/config"

// Simple rate limiting for evaluation calls
const evaluationCache = new Map<string, { timestamp: number; result: any }>()
const EVALUATION_COOLDOWN = 60 * 1000 // 1 minute cooldown

// Intent detection for critical flows that require evaluation
export function isCriticalFlow(userQuery: string, response: string): boolean {
  const criticalKeywords = [
    // Booking confirmation flows
    "confirm booking",
    "confirm reservation",
    "book now",
    "complete booking",
    "finalize reservation",
    "proceed with booking",
    "make reservation",

    // Contract and legal flows
    "summarize contract",
    "contract terms",
    "booking agreement",
    "cancellation policy",
    "legal terms",
    "refund policy",
    "booking conditions",

    // Payment and financial flows
    "payment details",
    "credit card",
    "payment method",
    "charge",
    "refund",
    "billing",
    "invoice",
    "receipt",

    // High-stakes availability changes
    "cancel booking",
    "modify reservation",
    "change dates",
    "update booking",
  ]

  const queryLower = userQuery.toLowerCase()
  const responseLower = response.toLowerCase()

  // Check if either user query or response contains critical keywords
  return criticalKeywords.some(
    keyword => queryLower.includes(keyword) || responseLower.includes(keyword),
  )
}

// Store evaluation feedback for future system prompt improvements
export async function storeEvaluationFeedback({
  threadId,
  userQuery,
  response,
  evaluation,
  systemPrompt,
  timestamp,
}: {
  threadId?: string
  userQuery: string
  response: string
  evaluation: any
  systemPrompt: string
  timestamp: string
}) {
  try {
    // For now, store in memory cache - can be extended to database later
    const feedbackKey = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const feedbackData = {
      threadId,
      userQuery,
      response: response.substring(0, 500), // Store first 500 chars for reference
      evaluation: {
        score: evaluation.score,
        isAccurate: evaluation.isAccurate,
        hallucinations: evaluation.hallucinations?.slice(0, 3) || [], // Store first 3 hallucinations
        corrections: evaluation.corrections?.slice(0, 3) || [], // Store first 3 corrections
      },
      systemPrompt: systemPrompt.substring(0, 1000), // Store first 1000 chars
      timestamp,
    }

    // Store in memory cache (in production, this would go to a database)
    evaluationCache.set(feedbackKey, {
      timestamp: Date.now(),
      result: feedbackData,
    })

    console.log("Evaluation feedback stored for future improvements:", {
      feedbackKey,
      score: evaluation.score,
      hasCorrections: evaluation.corrections?.length > 0,
    })

    // In a real implementation, you would:
    // 1. Store this in Supabase/PostgreSQL
    // 2. Aggregate feedback patterns
    // 3. Update system prompts based on common issues
    // 4. Track improvement over time
  } catch (error) {
    console.error("Failed to store evaluation feedback:", error)
  }
}

// New function to perform evaluation in background
export async function performBackgroundEvaluation(
  fullResponse: string,
  toolOutputs: any[],
  sanityData: any,
  messages: any[],
  context: any,
  systemPrompt: string,
  threadId?: string,
) {
  try {
    // Check if we've recently evaluated similar content
    const responseHash = fullResponse.substring(0, 200) // First 200 chars
    const cached = evaluationCache.get(responseHash)

    if (cached && Date.now() - cached.timestamp < EVALUATION_COOLDOWN) {
      console.log("Using cached evaluation result for similar content")
      return cached.result
    }

    // Skip evaluation for simple responses to reduce rate limiting
    if (fullResponse.length < 50 || !fullResponse.includes("Villa")) {
      console.log("Skipping evaluation for simple/short response")
      return
    }

    // Use introspection mode only (no external evaluation model)
    let evaluation = {
      score: 8,
      isAccurate: true,
      hallucinations: [],
      corrections: [],
    }

    evaluation = await introspectionModeEvaluation({
      response: fullResponse,
      toolOutputs,
      sanityData,
      userMessages: messages.map((m: any) => m.content).filter(Boolean),
      context,
      apiError: null,
    })

    // Cache the result
    evaluationCache.set(responseHash, {
      result: evaluation,
      timestamp: Date.now(),
    })

    // Clean up old cache entries
    if (evaluationCache.size > 20) {
      const now = Date.now()
      for (const [key, value] of evaluationCache.entries()) {
        if (now - value.timestamp > EVALUATION_COOLDOWN * 10) {
          evaluationCache.delete(key)
        }
      }
    }

    // Log evaluation results
    console.log("Response evaluation:", {
      score: evaluation.score,
      isAccurate: evaluation.isAccurate,
      hallucinationsCount: evaluation.hallucinations?.length || 0,
    })

    // Store evaluation feedback for future conversations instead of regenerating
    if (
      evaluation.score < 8 ||
      !evaluation.isAccurate ||
      (evaluation.hallucinations && evaluation.hallucinations.length > 0)
    ) {
      console.warn(
        "Low quality response detected - storing feedback for future improvements:",
        {
          score: evaluation.score,
          isAccurate: evaluation.isAccurate,
          hallucinationsCount: evaluation.hallucinations?.length || 0,
        },
      )

      // Store evaluation feedback for system prompt improvements
      await storeEvaluationFeedback({
        threadId,
        userQuery: messages[messages.length - 1]?.content || "",
        response: fullResponse,
        evaluation,
        systemPrompt,
        timestamp: new Date().toISOString(),
      })
    }

    console.log(
      "Background evaluation completed - feedback stored for future improvements",
    )
  } catch (error) {
    console.error("Background evaluation error:", error)
  }
}
