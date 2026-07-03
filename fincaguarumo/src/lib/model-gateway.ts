/**
 * Model Gateway - Central Entry Point for All LLM Calls
 *
 * Consolidates routing, health checking, fallback, auth, and environment selection
 * into a single callable entry point with a unified execute(role, request) function.
 *
 * Execute Contract:
 * 1. Resolve role → adapter + modelRef via registry
 * 2. Check circuit breaker before sending
 * 3. Select adapter (local Ollama in dev, remote in production) based on NEXT_PUBLIC_NETLIFY_ENV
 * 4. Resolve auth — look up the right API key for the resolved adapter
 * 5. Send request with timeout
 * 6. On failure: log, update circuit breaker, advance fallback chain, retry with next model
 * 7. Return typed result including which model was actually used and latency
 * 8. Record metrics for health and promotion decisions
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import { generateText } from "ai"
import {
  getModelConfig,
  getModelRole,
  getEffectiveCapabilities,
  ModelRole,
} from "./model-registry"
import { shouldUseLocalGenerations } from "./task-router"
import {
  getAdapter,
  hasAdapter,
  validateAllAdapters,
} from "./adapters/adapter-registry"
import type { AdapterConfig } from "./adapters/provider-adapter"
import {
  assertModelSelectionWithinBudget,
  FALLBACK_CHAIN_MAX_DURATION_MS,
} from "./model-performance-budgets"
import {
  shouldAllowRequest,
  recordSuccessfulRequest,
  recordFailedRequest,
  shouldTriggerCircuitBreaker,
  armCircuitBreakerWithProgressiveDisable,
  getCircuitBreakerState,
} from "./health-checker"
import { withTimeout } from "./monitoring/retry"
import {
  createDegradationResponse,
  type DegradationResponse,
  isDegradationResponse as checkDegradationResponse,
} from "./degradation-response"
import { validateModelRole, isModelBlacklisted } from "./model-validator"
// ---------------------------------------------------------------------------
// Gateway Request/Response Types
// ---------------------------------------------------------------------------

export interface GatewayRequest {
  role: string
  taskType?: string
  content?: string
  context?: any
  preferences?: {
    preferredModel?: string
    maxLatency?: number
    costOptimized?: boolean
  }
  manualOverrides?: {
    role?: string
    adapterKey?: string
    modelRef?: string
  }
  isBenchmark?: boolean
  // AI SDK specific parameters
  messages?: Array<{ role: string; content: string }>
  tools?: any
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  stream?: boolean // Whether to use streaming (streamText) or non-streaming (generateText)
}

export interface GatewayResponse {
  model: LanguageModelV3
  modelUsed: string
  adapterKey: string
  modelRef: string
  fallbackChain: Array<{ adapterKey: string; modelRef: string }>
  metrics: {
    latency: number
    modelRef: string
    adapterKey: string
  }
  selectedBy: "rule" | "override" | "fallback"
  toolConfig: ToolCallingConfig
}

export type GatewayResult = GatewayResponse | DegradationResponse

// Re-export degradation response utilities for convenience
export { checkDegradationResponse as isDegradationResponse }

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return "Unknown error"
}

// ---------------------------------------------------------------------------
// Tool-Calling Format Configuration
// ---------------------------------------------------------------------------

export interface ToolCallingConfig {
  format: "hermes" | "json" | "default"
  systemPrompt?: string
}

/**
 * Get tool-calling configuration for a role
 * Tool-calling models perform best with Hermes-style template, not bare JSON mode
 */
function getToolCallingConfig(role: ModelRole): ToolCallingConfig {
  const effective = getEffectiveCapabilities(role)

  if (effective.toolCalling && role.id === "tools") {
    return {
      format: "hermes",
      systemPrompt:
        "You are a helpful assistant with access to tools. Use the Hermes-style tool-calling format.",
    }
  }

  return {
    format: "default",
  }
}

// ---------------------------------------------------------------------------
// Environment Selection
// ---------------------------------------------------------------------------

/**
 * Select adapter based on environment (local Ollama in dev, remote in production)
 */
function selectAdapterForEnvironment(
  adapterKey: string,
  role: ModelRole,
): string {
  const isDev = process.env.NODE_ENV === "development"
  const isLocal = adapterKey === "local" || adapterKey === "ollama"

  // For embedding roles, check if we should use local
  if (role.id === "embedding-local" && isDev && isLocal) {
    return adapterKey
  }

  // For embedding-remote, always use remote in production
  if (role.id === "embedding-remote" && !isDev) {
    return adapterKey
  }

  // For generation roles (primary, tools, fast, evaluation), check if we should use local
  const isGenerationRole = ["primary", "tools", "fast", "evaluation"].includes(
    role.id,
  )
  if (isGenerationRole && isDev && shouldUseLocalGenerations()) {
    // If local generations are enabled and we have a local adapter, use it
    return "local"
  }

  // For development with local adapter (fallback), use local
  if (isDev && isLocal) {
    return adapterKey
  }

  // Default to the configured adapter
  return adapterKey
}

// ---------------------------------------------------------------------------
// Auth Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve API key for the given adapter
 * Gateway reads API keys and passes credentials to adapters
 * Adapters never read process.env directly
 */
function resolveAuthCredentials(adapterKey: string): string | undefined {
  const keyMap: Record<string, string> = {
    together: process.env.TOGETHER_API_KEY || "",
    openai: process.env.OPENAI_API_KEY || "",
    ollama: "", // Local Ollama doesn't need API key
    local: "", // Local adapter doesn't need API key
  }

  return (
    keyMap[adapterKey] || process.env[`${adapterKey.toUpperCase()}_API_KEY`]
  )
}

// ---------------------------------------------------------------------------
// Core Gateway Execute Function
// ---------------------------------------------------------------------------

/**
 * Execute a request through the model gateway
 * This is the single entry point for all LLM calls
 */
export async function execute(request: GatewayRequest): Promise<GatewayResult> {
  const selectionStart = Date.now()
  const startTime = selectionStart
  const roleId = request.manualOverrides?.role || request.role

  // Step 1: Resolve role → adapter + modelRef via registry
  const role = getModelRole(roleId)
  if (!role) {
    return createDegradationResponse(
      roleId,
      [],
      [
        {
          adapterKey: "unknown",
          modelRef: "unknown",
          error: `No model configured for role: ${roleId}`,
        },
      ],
      undefined,
    )
  }

  // Step 1.5: Validate models to prevent infinite loops from invalid model names
  const modelValidation = await validateModelRole(role)
  if (!modelValidation.isValid) {
    console.warn(
      `🚫 Model validation failed for role ${roleId}:`,
      modelValidation.errors,
    )
    return createDegradationResponse(
      roleId,
      [],
      modelValidation.errors.map(error => ({
        adapterKey: role.adapterKey,
        modelRef: role.modelRef,
        error,
      })),
      undefined,
    )
  }

  // Apply manual overrides if present
  let adapterKey = role.adapterKey
  let modelRef = role.modelRef
  let selectedBy: "rule" | "override" | "fallback" = "rule"

  if (
    request.manualOverrides?.adapterKey &&
    request.manualOverrides?.modelRef
  ) {
    // Validate override scope (A4: limited to runtime production traffic for primary generation)
    const isBenchmarkRun = request.isBenchmark === true
    const isEvaluationRoute = request.taskType === "evaluation"
    const isToolsRoute = request.taskType === "tools"
    const isPrimaryGeneration = request.taskType === "generation"

    if (isBenchmarkRun) {
      return createDegradationResponse(
        roleId,
        [],
        [
          {
            adapterKey: "override",
            modelRef: "override",
            error: "Manual overrides not allowed during benchmark runs",
          },
        ],
        undefined,
      )
    }

    if (isEvaluationRoute || isToolsRoute || !isPrimaryGeneration) {
      return createDegradationResponse(
        roleId,
        [],
        [
          {
            adapterKey: "override",
            modelRef: "override",
            error: "Manual overrides only allowed for primary generation role",
          },
        ],
        undefined,
      )
    }

    adapterKey = request.manualOverrides.adapterKey
    modelRef = request.manualOverrides.modelRef
    selectedBy = "override"
  }

  // Step 2: Check circuit breaker before sending
  if (!shouldAllowRequest(roleId)) {
    return createDegradationResponse(
      roleId,
      [],
      [{ adapterKey, modelRef, error: "Circuit breaker active" }],
      undefined,
    )
  }

  // Step 3: Select adapter based on environment
  adapterKey = selectAdapterForEnvironment(adapterKey, role)

  // Step 4: Resolve auth credentials
  const apiKey = resolveAuthCredentials(adapterKey)

  // Track attempted models for fallback
  const attemptedModels: Array<{ adapterKey: string; modelRef: string }> = []
  const failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }> = []

  // Try primary model
  attemptedModels.push({ adapterKey, modelRef })

  try {
    const { model, toolConfig } = await executeWithAdapter(
      roleId,
      adapterKey,
      modelRef,
      role,
      apiKey,
      request,
      startTime,
    )

    recordSuccessfulRequest(roleId, Date.now() - startTime)

    const response: GatewayResponse = {
      model,
      modelUsed: roleId,
      adapterKey,
      modelRef,
      fallbackChain: role.fallbacks,
      metrics: {
        latency: Date.now() - startTime,
        modelRef,
        adapterKey,
      },
      selectedBy,
      toolConfig,
    }

    assertModelSelectionWithinBudget(
      Date.now() - selectionStart,
      `execute(${roleId})`,
    )

    return response
  } catch (error) {
    const errorMsg = toErrorMessage(error)
    const failureTimestamp = new Date()

    // Log structured fallback attempt
    console.log(`🔄 Fallback attempt for ${roleId}`, {
      timestamp: failureTimestamp.toISOString(),
      attemptedModel: { adapterKey, modelRef },
      error: errorMsg,
      latency: Date.now() - startTime,
      totalAttempts: attemptedModels.length + 1,
    })

    failureReasons.push({
      adapterKey,
      modelRef,
      error: errorMsg,
    })
    recordFailedRequest(roleId, errorMsg)

    // Step 6: On failure, advance fallback chain and retry
    if (role.fallbacks && role.fallbacks.length > 0) {
      return await executeWithFallbackChain(
        roleId,
        role.fallbacks,
        role,
        request,
        startTime,
        attemptedModels,
        failureReasons,
      )
    }

    // Log complete failure of all models
    console.log(`💥 All models failed for role ${roleId}`, {
      timestamp: failureTimestamp.toISOString(),
      totalAttempts: attemptedModels.length,
      failureReasons: failureReasons.map(f => ({
        model: `${f.adapterKey}:${f.modelRef}`,
        error: f.error,
      })),
      totalLatency: Date.now() - startTime,
    })

    // All models failed - return degradation response
    return createDegradationResponse(
      roleId,
      attemptedModels,
      failureReasons,
      undefined,
    )
  }
}

// ---------------------------------------------------------------------------
// Execute with specific adapter
// ---------------------------------------------------------------------------

async function executeWithAdapter(
  roleId: string,
  adapterKey: string,
  modelRef: string,
  role: ModelRole,
  apiKey: string | undefined,
  request: GatewayRequest,
  startTime: number,
): Promise<{ model: LanguageModelV3; toolConfig: ToolCallingConfig }> {
  // Check adapter exists
  if (!hasAdapter(adapterKey)) {
    throw new Error(`No adapter registered for key "${adapterKey}"`)
  }

  const adapter = getAdapter(adapterKey)

  // Create model instance
  const aiModel = adapter.createModelInstance(modelRef)

  // Apply tool-calling configuration if needed
  const toolConfig = getToolCallingConfig(role)

  return { model: aiModel, toolConfig }
}

// ---------------------------------------------------------------------------
// Execute with fallback chain
// ---------------------------------------------------------------------------

async function executeWithFallbackChain(
  roleId: string,
  fallbacks: Array<{ adapterKey: string; modelRef: string }>,
  role: ModelRole,
  request: GatewayRequest,
  startTime: number,
  attemptedModels: Array<{ adapterKey: string; modelRef: string }>,
  failureReasons: Array<{
    adapterKey: string
    modelRef: string
    error: string
  }>,
): Promise<GatewayResult | DegradationResponse> {
  const chainStart = startTime

  for (let i = 0; i < fallbacks.length; i++) {
    const fallback = fallbacks[i]
    const elapsedChain = Date.now() - chainStart

    // Check fallback chain duration budget
    if (elapsedChain >= FALLBACK_CHAIN_MAX_DURATION_MS) {
      failureReasons.push({
        adapterKey: fallback.adapterKey,
        modelRef: fallback.modelRef,
        error: `Fallback chain exceeded ${FALLBACK_CHAIN_MAX_DURATION_MS}ms`,
      })
      break
    }

    attemptedModels.push(fallback)

    // Check if fallback model is blacklisted (prevents infinite loops)
    if (isModelBlacklisted(fallback.adapterKey, fallback.modelRef)) {
      failureReasons.push({
        adapterKey: fallback.adapterKey,
        modelRef: fallback.modelRef,
        error: "Model is blacklisted due to repeated failures",
      })
      continue
    }

    // Check circuit breaker for fallback
    const fallbackRoleId = `${roleId}-fallback-${i}`
    if (!shouldAllowRequest(fallbackRoleId)) {
      failureReasons.push({
        adapterKey: fallback.adapterKey,
        modelRef: fallback.modelRef,
        error: "Circuit breaker active for fallback",
      })
      continue
    }

    // Select adapter based on environment
    const adapterKey = selectAdapterForEnvironment(fallback.adapterKey, role)

    // Resolve auth
    const apiKey = resolveAuthCredentials(adapterKey)

    try {
      const { model, toolConfig } = await executeWithAdapter(
        fallbackRoleId,
        adapterKey,
        fallback.modelRef,
        role,
        apiKey,
        request,
        startTime,
      )

      recordSuccessfulRequest(roleId, Date.now() - startTime)

      const response: GatewayResponse = {
        model,
        modelUsed: roleId,
        adapterKey,
        modelRef: fallback.modelRef,
        fallbackChain: fallbacks,
        metrics: {
          latency: Date.now() - startTime,
          modelRef: fallback.modelRef,
          adapterKey,
        },
        selectedBy: "fallback",
        toolConfig,
      }

      assertModelSelectionWithinBudget(
        Date.now() - startTime,
        `executeWithFallbackChain(${roleId})`,
      )

      return response
    } catch (error) {
      const errorMsg = toErrorMessage(error)
      const fallbackTimestamp = new Date()

      // Log structured fallback attempt
      console.log(`🔄 Fallback attempt for ${roleId}`, {
        timestamp: fallbackTimestamp.toISOString(),
        attemptedModel: {
          adapterKey: fallback.adapterKey,
          modelRef: fallback.modelRef,
        },
        error: errorMsg,
        latency: Date.now() - startTime,
        totalAttempts: attemptedModels.length + 1,
        fallbackIndex: i,
        totalFallbacks: fallbacks.length,
      })

      failureReasons.push({
        adapterKey: fallback.adapterKey,
        modelRef: fallback.modelRef,
        error: errorMsg,
      })
      recordFailedRequest(roleId, errorMsg)
    }
  }

  // Log complete failure of all fallback models
  console.log(`💥 All fallback models failed for role ${roleId}`, {
    timestamp: new Date().toISOString(),
    totalAttempts: attemptedModels.length,
    failureReasons: failureReasons.map(f => ({
      model: `${f.adapterKey}:${f.modelRef}`,
      error: f.error,
    })),
    totalLatency: Date.now() - startTime,
    chainDuration: Date.now() - chainStart,
  })

  // All fallbacks failed
  return createDegradationResponse(
    roleId,
    attemptedModels,
    failureReasons,
    undefined,
  )
}

// ---------------------------------------------------------------------------
// resolveModel — convenience for callers that require a model instance
// ---------------------------------------------------------------------------

/**
 * Resolve a model for the given role via the gateway.
 * Throws when the gateway returns a degradation response.
 */
export async function resolveModel(
  role: string,
  request?: Omit<GatewayRequest, "role">,
): Promise<GatewayResponse> {
  const result = await execute({ role, ...request })
  if (checkDegradationResponse(result)) {
    const reason =
      result.failureReasons[0]?.error ?? result.message ?? "Model unavailable"
    throw new Error(`No model available for role "${role}": ${reason}`)
  }
  return result
}

// ---------------------------------------------------------------------------
// Configuration & connectivity utilities
// ---------------------------------------------------------------------------

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

export function validateModelEnvironment(): {
  isValid: boolean
  missing: string[]
  warnings: string[]
} {
  const config = getModelConfig()
  const adapterConfigs: AdapterConfig[] = Object.values(config).map(role => ({
    adapterKey: role.adapterKey,
    requiredSecrets: hasAdapter(role.adapterKey)
      ? getAdapter(role.adapterKey).getRequiredSecrets()
      : [],
  }))
  return validateAllAdapters(adapterConfigs)
}

export function getModelRecommendation(
  useCase: "generation" | "evaluation" | "fast" | "quality",
): string[] {
  const recommendations: Record<string, string[]> = {
    generation: ["primary", "tools"],
    evaluation: ["evaluation"],
    fast: ["fast"],
    quality: ["primary", "evaluation"],
  }
  return recommendations[useCase] || []
}

export async function testModelConnectivity(
  roleId: string,
  options?: { timeoutMs?: number },
): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  const timeoutMs = options?.timeoutMs ?? FALLBACK_CHAIN_MAX_DURATION_MS
  try {
    const { model } = await resolveModel(roleId)
    const startTime = Date.now()
    await withTimeout(
      generateText({
        model,
        prompt: "Test connectivity",
        maxRetries: 1,
      }),
      timeoutMs,
    )
    return { success: true, latency: Date.now() - startTime }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function testModelConnectivityWithCircuitBreaker(
  roleId: string,
): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  if (!shouldAllowRequest(roleId)) {
    return { success: false, error: "Circuit breaker active" }
  }

  const { performHealthCheck } = await import("./health-checker")

  try {
    const result = await performHealthCheck(roleId)

    if (result.isHealthy) {
      return { success: true, latency: result.latency }
    }

    if (shouldTriggerCircuitBreaker(roleId)) {
      const s = getCircuitBreakerState(roleId)
      armCircuitBreakerWithProgressiveDisable(roleId, {
        failureCount: (s.failureCount || 0) + 1,
        lastFailureTime: new Date(),
        consecutiveFailures: (s.consecutiveFailures || 0) + 1,
      })
    }

    return { success: false, error: result.error }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
