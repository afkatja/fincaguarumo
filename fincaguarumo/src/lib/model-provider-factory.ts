/**
 * Role-Based Model Provider Factory — Provider-Agnostic Phase 2
 *
 * The factory no longer imports vendor SDKs or switches on provider names.
 * Instead, it asks the adapter registry for an adapter by key and delegates
 * model instantiation, health checks, and config validation to the adapter.
 *
 * A6 (Graceful degradation): When all models in a role fail, the factory
 * returns a typed DegradationResponse instead of throwing, allowing callers
 * to distinguish between no-answer-available, partial-answer,
 * stale-cached-answer, and fallback-generated-minimal-response.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import {
  getModelConfig,
  getModelRole,
  ModelRole,
  getEffectiveCapabilities,
} from "./model-registry"
import {
  getAdapter,
  validateAllAdapters,
  hasAdapter,
} from "./adapters/adapter-registry"
import type { AdapterConfig } from "./adapters/provider-adapter"
import {
  shouldAllowRequest,
  recordSuccessfulRequest,
  recordFailedRequest,
  shouldTriggerCircuitBreaker,
  armCircuitBreakerWithProgressiveDisable,
  getCircuitBreakerState,
} from "./health-checker"
import {
  assertModelSelectionWithinBudget,
  FALLBACK_CHAIN_MAX_DURATION_MS,
} from "./model-performance-budgets"
import { withTimeout } from "./monitoring/retry"

// Re-export all degradation types and helpers from the dedicated module
// so existing import paths continue to work.
export type {
  DegradationType,
  DegradationResponse,
} from "./degradation-response"
export {
  classifyDegradationType,
  createDegradationResponse,
  isDegradationResponse,
  cacheEvaluationData,
  getCachedEvaluationData,
  clearEvaluationCache,
} from "./degradation-response"

import {
  createDegradationResponse,
  type DegradationResponse,
} from "./degradation-response"

export interface ModelProvider {
  model: LanguageModelV3
  modelRef: string
  adapterKey: string
  capabilities: {
    streaming: boolean
    tools: boolean
    evaluation: boolean
    generation: boolean
  }
  maxTokens: number
  role: string
  fallbacks: Array<{ adapterKey: string; modelRef: string }>
  healthStatus: {
    isHealthy: boolean
    lastChecked: Date
    consecutiveFailures: number
    circuitBreakerActive: boolean
  }
}

// ---------------------------------------------------------------------------
// Core factory — no switch statements, no vendor imports
// ---------------------------------------------------------------------------

/**
 * Create a ModelProvider for the given role by looking up the adapter
 * from the registry and delegating instantiation.
 */
export function createModelProvider(roleId: string): ModelProvider {
  const selectionStart = Date.now()
  const role = getModelRole(roleId)

  if (!role) {
    throw new Error(`No model configured for role: ${roleId}`)
  }

  // Check circuit breaker before proceeding
  if (!shouldAllowRequest(roleId)) {
    throw new Error(`Model ${roleId} is circuit-breaked`)
  }

  // Resolve adapter from registry — no vendor switch needed
  if (!hasAdapter(role.adapterKey)) {
    throw new Error(
      `No adapter registered for key "${role.adapterKey}". ` +
        `Register an adapter before using role "${roleId}".`,
    )
  }

  const adapter = getAdapter(role.adapterKey)

  let aiModel: LanguageModelV3
  try {
    aiModel = adapter.createModelInstance(role.modelRef)
  } catch (error) {
    throw new Error(
      `Failed to create model instance for ${role.adapterKey}:${role.modelRef}: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }

  const effective = getEffectiveCapabilities(role)

  assertModelSelectionWithinBudget(
    Date.now() - selectionStart,
    `createModelProvider(${roleId})`,
  )

  return {
    model: aiModel,
    modelRef: role.modelRef,
    adapterKey: role.adapterKey,
    capabilities: {
      streaming: effective.streaming,
      tools: effective.toolCalling,
      evaluation: effective.evaluation,
      generation: effective.generation,
    },
    maxTokens: role.maxTokens,
    role: role.id,
    fallbacks: role.fallbacks,
    healthStatus: role.healthStatus,
  }
}

// ---------------------------------------------------------------------------
// Fallback-aware factory (A6: returns DegradationResponse instead of throwing)
// ---------------------------------------------------------------------------

/**
 * Enhanced model provider with role-based routing and fallback chains.
 *
 * When all models in the chain fail the function no longer throws — it
 * returns a typed {@link DegradationResponse} so callers can gracefully
 * degrade the user experience.  Use the {@link isDegradationResponse} type
 * guard to distinguish between a healthy `ModelProvider` and a degradation
 * result.
 */
export async function createModelProviderWithFallback(
  roleId: string,
): Promise<ModelProvider | DegradationResponse> {
  const chainStart = Date.now()
  const startTime = chainStart

  // Track every model that was attempted and why it failed
  const attemptedModels: Array<{ adapterKey: string; modelRef: string }> = []
  const failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }> = []
  let partialContent: string | undefined

  // --- Try primary model --------------------------------------------------
  try {
    const provider = createModelProvider(roleId)
    recordSuccessfulRequest(roleId, Date.now() - startTime)
    return provider
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"

    // Record failed request for circuit breaker
    recordFailedRequest(roleId, errorMsg)

    const role = getModelRole(roleId)
    if (role) {
      attemptedModels.push({
        adapterKey: role.adapterKey,
        modelRef: role.modelRef,
      })
      failureReasons.push({
        adapterKey: role.adapterKey,
        modelRef: role.modelRef,
        error: errorMsg,
      })
    } else {
      // No configuration at all — immediately degrade
      return createDegradationResponse(
        roleId,
        attemptedModels,
        failureReasons,
        partialContent,
      )
    }
  }

  // --- Try fallback models ------------------------------------------------
  const role = getModelRole(roleId)!
  if (role.fallbacks && role.fallbacks.length > 0) {
    console.log(`🔄 Primary model ${roleId} failed, trying fallbacks`)

    for (let i = 0; i < role.fallbacks.length; i++) {
      const fallback = role.fallbacks[i]
      const elapsedChain = Date.now() - chainStart
      if (elapsedChain >= FALLBACK_CHAIN_MAX_DURATION_MS) {
        failureReasons.push({
          adapterKey: fallback.adapterKey,
          modelRef: fallback.modelRef,
          error: `FG-29 NFR: fallback chain exceeded ${FALLBACK_CHAIN_MAX_DURATION_MS}ms before this attempt`,
        })
        break
      }

      attemptedModels.push({
        adapterKey: fallback.adapterKey,
        modelRef: fallback.modelRef,
      })

      try {
        console.log(
          `🔄 Trying fallback ${i + 1}/${role.fallbacks.length}: ${fallback.adapterKey}:${fallback.modelRef}`,
        )

        // Create a temporary model role for the fallback
        const fallbackRole: ModelRole = {
          ...role,
          id: `${roleId}-fallback-${i}`,
          adapterKey: fallback.adapterKey,
          modelRef: fallback.modelRef,
        }

        const remainingMs = Math.max(
          1,
          FALLBACK_CHAIN_MAX_DURATION_MS - (Date.now() - chainStart),
        )

        const result = await testConnectivityForModelRole(fallbackRole, {
          timeoutMs: remainingMs,
        })

        if (result.success) {
          // Create provider for fallback model
          const fallbackProvider = createModelProviderForRole(fallbackRole)
          recordSuccessfulRequest(roleId, result.latency || 0)
          return fallbackProvider
        }

        // Connectivity test returned unsuccessful — record reason
        failureReasons.push({
          adapterKey: fallback.adapterKey,
          modelRef: fallback.modelRef,
          error: result.error || "Connectivity test failed",
        })
      } catch (fallbackError) {
        const fallbackErrorMsg =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown error"

        failureReasons.push({
          adapterKey: fallback.adapterKey,
          modelRef: fallback.modelRef,
          error: fallbackErrorMsg,
        })

        console.error(`Fallback ${i + 1} failed:`, fallbackErrorMsg)
      }
    }
  }

  // --- All models failed — return graceful degradation (A6) ---------------
  console.warn(
    `⚠️ All models failed for role ${roleId}. Returning degradation response.`,
  )

  return createDegradationResponse(
    roleId,
    attemptedModels,
    failureReasons,
    partialContent,
  )
}

// ---------------------------------------------------------------------------
// Internal: create ModelProvider for a direct ModelRole (used for fallbacks)
// ---------------------------------------------------------------------------

function createModelProviderForRole(modelRole: ModelRole): ModelProvider {
  const selectionStart = Date.now()
  // Check circuit breaker before proceeding
  if (!shouldAllowRequest(modelRole.id)) {
    throw new Error(`Model ${modelRole.id} is circuit-breaked`)
  }

  // Resolve adapter from registry
  if (!hasAdapter(modelRole.adapterKey)) {
    throw new Error(`No adapter registered for key "${modelRole.adapterKey}".`)
  }

  const adapter = getAdapter(modelRole.adapterKey)

  let aiModel: LanguageModelV3
  try {
    aiModel = adapter.createModelInstance(modelRole.modelRef)
  } catch (error) {
    throw new Error(
      `Failed to create model instance for ${modelRole.adapterKey}:${modelRole.modelRef}: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }

  const effective = getEffectiveCapabilities(modelRole)

  assertModelSelectionWithinBudget(
    Date.now() - selectionStart,
    `createModelProviderForRole(${modelRole.id})`,
  )

  return {
    model: aiModel,
    modelRef: modelRole.modelRef,
    adapterKey: modelRole.adapterKey,
    capabilities: {
      streaming: effective.streaming,
      tools: effective.toolCalling,
      evaluation: effective.evaluation,
      generation: effective.generation,
    },
    maxTokens: modelRole.maxTokens,
    role: modelRole.id,
    fallbacks: modelRole.fallbacks,
    healthStatus: modelRole.healthStatus,
  }
}

/**
 * Probe a concrete adapter+model via a minimal generateText call, bounded by FG-29 fallback budget.
 */
async function testConnectivityForModelRole(
  modelRole: ModelRole,
  options: { timeoutMs: number },
): Promise<{ success: boolean; error?: string; latency?: number }> {
  try {
    const provider = createModelProviderForRole(modelRole)
    const startTime = Date.now()
    const { generateText } = await import("ai")
    await withTimeout(
      generateText({
        model: provider.model,
        prompt: "Test connectivity",
        maxRetries: 1,
      }),
      options.timeoutMs,
    )
    return { success: true, latency: Date.now() - startTime }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ---------------------------------------------------------------------------
// Connectivity & health
// ---------------------------------------------------------------------------

/**
 * Test model connectivity with circuit breaker awareness
 */
export async function testModelConnectivityWithCircuitBreaker(
  roleId: string,
): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  // Check if circuit breaker allows the request
  if (!shouldAllowRequest(roleId)) {
    return { success: false, error: "Circuit breaker active" }
  }

  // Import health check function
  const { performHealthCheck } = await import("./health-checker")

  try {
    const result = await performHealthCheck(roleId)

    if (result.isHealthy) {
      return { success: true, latency: result.latency }
    } else {
      // Health check failed, trigger circuit breaker if needed
      if (shouldTriggerCircuitBreaker(roleId)) {
        const s = getCircuitBreakerState(roleId)
        armCircuitBreakerWithProgressiveDisable(roleId, {
          failureCount: (s.failureCount || 0) + 1,
          lastFailureTime: new Date(),
          consecutiveFailures: (s.consecutiveFailures || 0) + 1,
        })
      }

      return { success: false, error: result.error }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get all available model configurations
 * Returns model roles in a provider-agnostic format
 */
export function getAvailableModels() {
  const config = getModelConfig()

  return {
    primary: config.primary,
    tools: config.tools,
    fast: config.fast,
    evaluation: config.evaluation,
    embeddingLocal: config.embeddingLocal,
    embeddingRemote: config.embeddingRemote,
  }
}

/**
 * Add a new model configuration through the model registry
 * Note: This would require extending the model registry to support dynamic updates
 */
export function addModelConfig(
  roleId: string,
  modelRole: Partial<ModelRole>,
): void {
  // TODO: Implement dynamic model registry updates
  console.warn(
    `Dynamic model configuration not yet implemented for role: ${roleId}`,
  )
  throw new Error(
    `Dynamic model configuration not supported. Please use environment variables to configure models.`,
  )
}

/**
 * Update an existing model configuration through the model registry
 * Note: This would require extending the model registry to support dynamic updates
 */
export function updateModelConfig(
  roleId: string,
  updates: Partial<ModelRole>,
): void {
  // TODO: Implement dynamic model registry updates
  console.warn(
    `Dynamic model configuration not yet implemented for role: ${roleId}`,
  )
  throw new Error(
    `Dynamic model configuration not supported. Please use environment variables to configure models.`,
  )
}

/**
 * Test model connectivity
 *
 * @param options.timeoutMs — defaults to {@link FALLBACK_CHAIN_MAX_DURATION_MS} (FG-29 NFR).
 */
export async function testModelConnectivity(
  configKey: string,
  options?: { timeoutMs?: number },
): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  const timeoutMs = options?.timeoutMs ?? FALLBACK_CHAIN_MAX_DURATION_MS
  try {
    const provider = createModelProvider(
      configKey as "primary" | "tools" | "fast" | "evaluation",
    )
    const startTime = Date.now()

    // Simple test request
    const { generateText } = await import("ai")
    await withTimeout(
      generateText({
        model: provider.model,
        prompt: "Test connectivity",
        maxRetries: 1,
      }),
      timeoutMs,
    )

    const latency = Date.now() - startTime
    return { success: true, latency }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get model recommendations based on use case in a provider-agnostic way
 * Returns role IDs that match the requested capability
 */
export function getModelRecommendation(
  useCase: "generation" | "evaluation" | "fast" | "quality",
): string[] {
  // Provider-agnostic recommendations based on capabilities
  const recommendations: Record<string, string[]> = {
    generation: ["primary", "tools"], // Models with generation capability
    evaluation: ["evaluation"], // Models with evaluation capability
    fast: ["fast"], // Fast models
    quality: ["primary", "evaluation"], // High-quality models
  }

  return recommendations[useCase] || []
}

/**
 * Environment variable validation — fully provider-agnostic.
 *
 * Instead of a hardcoded providerApiKeys map, the core asks each
 * adapter what secrets it requires via getRequiredSecrets().
 */
export function validateModelEnvironment(): {
  isValid: boolean
  missing: string[]
  warnings: string[]
} {
  const config = getModelConfig()

  // Build adapter configs from the current model roles
  const adapterConfigs: AdapterConfig[] = Object.values(config).map(role => ({
    adapterKey: role.adapterKey,
    requiredSecrets: hasAdapter(role.adapterKey)
      ? getAdapter(role.adapterKey).getRequiredSecrets()
      : [],
  }))

  // Delegate validation to the adapter registry
  return validateAllAdapters(adapterConfigs)
}
