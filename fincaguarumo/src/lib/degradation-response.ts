/**
 * Graceful Degradation Response Types — FG-29 A6
 *
 * When all models in a role's fallback chain fail, the system returns a
 * typed DegradationResponse instead of throwing.  This allows callers to
 * gracefully degrade the user experience based on the specific failure
 * context.
 *
 * This module is intentionally free of adapter-registry imports so it can
 * be tested in isolation without requiring Web Streams API polyfills.
 */

import { getModelRole, getEffectiveCapabilities } from "./model-registry"

// ---------------------------------------------------------------------------
// Evaluation cache (shared with chatbot evaluation flows)
// ---------------------------------------------------------------------------

/**
 * Internal evaluation cache. Also used by better-chatbot config for
 * evaluation result caching.  Exported so that createDegradationResponse
 * can read cached data for stale-cached-answer responses.
 */
const evaluationCache = new Map<string, { result: any; timestamp: number }>()

/** Store an evaluation result in the cache */
export function cacheEvaluationData(
  key: string,
  data: { result: any; timestamp: number },
): void {
  evaluationCache.set(key, data)
}

/** Retrieve a cached evaluation result */
export function getCachedEvaluationData(
  key: string,
): { result: any; timestamp: number } | undefined {
  return evaluationCache.get(key)
}

/** Clear the evaluation cache (useful for testing) */
export function clearEvaluationCache(): void {
  evaluationCache.clear()
}

// ---------------------------------------------------------------------------
// Degradation types
// ---------------------------------------------------------------------------

/**
 * The four typed degradation levels per FG-29 A6.
 *
 * - `no-answer-available`         — No model produced any output; nothing to
 *                                   return to the caller.
 * - `partial-answer`              — A model returned an incomplete or
 *                                   truncated response before failing.
 * - `stale-cached-answer`         — No live model succeeded, but a previously
 *                                   cached evaluation result is available.
 * - `fallback-generated-minimal-response` — A minimal / generic response was
 *                                   synthesised without any model call (e.g. a
 *                                   static "service unavailable" message).
 */
export type DegradationType =
  | "no-answer-available"
  | "partial-answer"
  | "stale-cached-answer"
  | "fallback-generated-minimal-response"
  | "rag-context-fallback"

/**
 * Structured response returned when every model in a role's fallback chain
 * has failed.  Callers can inspect `degradationType` to decide how to
 * present the outcome to the user.
 */
export interface DegradationResponse {
  /** Always `true` — allows callers to distinguish from a normal result */
  isDegradation: true
  /** Which degradation category this response belongs to */
  degradationType: DegradationType
  /** Human-readable explanation suitable for logging or user-facing copy */
  message: string
  /** The role that experienced the total failure */
  roleId: string
  /** Ordered list of (adapterKey, modelRef) pairs that were attempted */
  attemptedModels: Array<{ adapterKey: string; modelRef: string }>
  /** Categorised errors per attempted model */
  failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }>
  /**
   * Optional payload — only present for `partial-answer` and
   * `stale-cached-answer` types.
   */
  partialContent?: string
  /** Timestamp of the degradation event */
  timestamp: Date
}

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

/**
 * Classify the degradation type based on the failure context.
 *
 * Decision logic (evaluated in priority order):
 *
 * 1. If a previous evaluation cache entry exists for the role →
 *    `stale-cached-answer`
 * 2. If any fallback returned a partial / truncated result before failing →
 *    `partial-answer`
 * 3. If the role has generation capability (i.e. it could theoretically
 *    produce a minimal static response) →
 *    `fallback-generated-minimal-response`
 * 4. Otherwise → `no-answer-available`
 */
export function classifyDegradationType(
  roleId: string,
  failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }>,
  partialContent?: string,
): DegradationType {
  // 1. Stale cached answer — evaluation cache has data for this role
  const cached = evaluationCache.get(roleId)
  if (cached) {
    return "stale-cached-answer"
  }

  // 2. Partial answer — at least one model returned content before failing
  if (partialContent && partialContent.trim().length > 0) {
    return "partial-answer"
  }

  // 3. Fallback-generated minimal response — roles with generation
  //    capability can always produce a generic "unavailable" message
  const role = getModelRole(roleId)
  if (role) {
    const caps = getEffectiveCapabilities(role)
    if (caps.generation || caps.toolCalling) {
      return "fallback-generated-minimal-response"
    }
  }

  // 4. Nothing available at all (e.g. embedding-only roles with no cache)
  return "no-answer-available"
}

// ---------------------------------------------------------------------------
// Response builder
// ---------------------------------------------------------------------------

/**
 * Build a default user-facing message for each degradation type.
 */
function defaultDegradationMessage(
  degradationType: DegradationType,
  roleId: string,
): string {
  switch (degradationType) {
    case "no-answer-available":
      return `No AI response is currently available for the "${roleId}" role. Please try again later.`
    case "partial-answer":
      return `A partial response was generated for the "${roleId}" role but could not be completed. The available content is included.`
    case "stale-cached-answer":
      return `Live models are unavailable for the "${roleId}" role. A previously cached result is being served and may be outdated.`
    case "fallback-generated-minimal-response":
      return `AI models are temporarily unavailable for the "${roleId}" role. A minimal fallback response has been generated.`
    case "rag-context-fallback":
      return `AI models are temporarily unavailable, but I found relevant information from our knowledge base to help answer your question.`
  }
}

/**
 * Create a RAG context fallback response when AI models fail but we have meaningful context.
 */
export function createRAGContextFallbackResponse(
  roleId: string,
  attemptedModels: Array<{ adapterKey: string; modelRef: string }>,
  failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }>,
  ragContext: string,
): DegradationResponse {
  return {
    isDegradation: true,
    degradationType: "rag-context-fallback",
    message: defaultDegradationMessage("rag-context-fallback", roleId),
    roleId,
    attemptedModels,
    failureReasons,
    timestamp: new Date(),
    partialContent: ragContext,
  }
}

/**
 * Create a fully-populated DegradationResponse.
 */
export function createDegradationResponse(
  roleId: string,
  attemptedModels: Array<{ adapterKey: string; modelRef: string }>,
  failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }>,
  partialContent?: string,
): DegradationResponse {
  const degradationType = classifyDegradationType(
    roleId,
    failureReasons,
    partialContent,
  )

  const response: DegradationResponse = {
    isDegradation: true,
    degradationType,
    message: defaultDegradationMessage(degradationType, roleId),
    roleId,
    attemptedModels,
    failureReasons,
    timestamp: new Date(),
  }

  // Attach partial / cached content when applicable
  if (degradationType === "partial-answer" && partialContent) {
    response.partialContent = partialContent
  }

  if (degradationType === "stale-cached-answer") {
    const cached = evaluationCache.get(roleId)
    if (cached) {
      response.partialContent =
        typeof cached.result === "string"
          ? cached.result
          : JSON.stringify(cached.result)
    }
  }

  return response
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/** Returns `true` if the value is a DegradationResponse */
export function isDegradationResponse(
  value: unknown,
): value is DegradationResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "isDegradation" in value &&
    (value as DegradationResponse).isDegradation === true
  )
}
