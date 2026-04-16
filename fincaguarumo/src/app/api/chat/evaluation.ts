import { introspectionModeEvaluation } from "../../../lib/better-chatbot/config"

// Simplified critical flow detection - only evaluate booking and payment related queries
export function isCriticalFlow(userQuery: string): boolean {
  const criticalPatterns = [
    // Booking confirmation flows
    /\b(confirm|complete|finalize|proceed|make)\s+(booking|reservation)\b/i,
    // Payment and financial flows
    /\b(payment|credit\s*card|charge|refund|billing|invoice|receipt)\b/i,
    // Contract and legal flows
    /\b(contract|terms|cancellation\s*policy|legal|agreement)\b/i,
    // High-stakes changes
    /\b(cancel|modify|change|update)\s+(booking|reservation)\b/i,
  ]

  return criticalPatterns.some(pattern => pattern.test(userQuery))
}

// Simplified feedback storage - just log for now
function logEvaluationResult(
  userQuery: string,
  evaluation: any,
  threadId?: string,
) {
  console.log("Chat evaluation completed:", {
    threadId,
    queryLength: userQuery.length,
    score: evaluation.score,
    isAccurate: evaluation.isAccurate,
    issues: evaluation.hallucinations?.length || 0,
  })

  // In production, store to database for analytics and prompt improvement
  // For now, just log to monitor quality
}

// Simplified background evaluation - focus on critical flows only
export async function performBackgroundEvaluation(
  fullResponse: string,
  toolOutputs: any[],
  sanityData: any,
  messages: any[],
  context: any,
  systemPrompt: string,
  threadId?: string,
  userQuery?: string,
) {
  try {
    // Skip evaluation for simple responses
    if (fullResponse.length < 50 || !fullResponse.includes("Villa")) {
      console.log("Skipping evaluation for simple/short response")
      return
    }

    // Use introspection mode evaluation
    const evaluation = await introspectionModeEvaluation({
      response: fullResponse,
      toolOutputs,
      sanityData,
      userMessages: messages.map((m: any) => m.content).filter(Boolean),
      context,
      apiError: null,
    })

    // Log results for monitoring
    logEvaluationResult(
      userQuery || messages[messages.length - 1]?.content || "",
      evaluation,
      threadId,
    )

    // Only take action on low-quality responses
    if (evaluation.score < 7 || !evaluation.isAccurate) {
      console.warn("Low quality response detected - review needed", {
        score: evaluation.score,
        isAccurate: evaluation.isAccurate,
        issues: evaluation.hallucinations?.length || 0,
      })
    }
  } catch (error) {
    console.error("Background evaluation error:", error)
  }
}
