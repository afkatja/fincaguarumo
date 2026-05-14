/**
 * Task Router for Role-Based Model Provider System
 * Routes requests to appropriate models based on task type and capabilities.
 *
 * Provider-agnostic: uses adapterKey/modelRef instead of provider/modelId.
 */

import {
  getModelRole,
  hasCapability,
  getModelsByCapability,
  ModelCapability,
} from "./model-registry"
import { assertModelSelectionWithinBudget } from "./model-performance-budgets"

export type TaskType =
  | "generation"
  | "tools"
  | "fast"
  | "evaluation"
  | "embedding-local"
  | "embedding-remote"

export interface RouteRequest {
  taskType: TaskType
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
}

export interface RouteResult {
  modelRole: string
  adapterKey: string
  modelRef: string
  fallbackChain: Array<{ adapterKey: string; modelRef: string }>
  selectedBy: "rule" | "override" | "fallback"
  latency: number
  metadata: {
    hasManualOverride: boolean
    originalRequest: TaskType
    routingTime: number
  }
}

/**
 * Route request to appropriate model based on task type and capabilities
 */
export function routeRequest(request: RouteRequest): RouteResult {
  const startTime = Date.now()

  try {
    // Check for manual overrides first
    // A4: Override scope is limited to runtime production traffic for primary generation role only
    // Does not affect benchmark runs, evaluation routes, or tools routes
    if (request.manualOverrides?.role) {
      // Validate override scope
      const isBenchmarkRun = request.isBenchmark === true
      const isEvaluationRoute = request.taskType === "evaluation"
      const isToolsRoute = request.taskType === "tools"
      const isPrimaryGeneration = request.taskType === "generation"

      if (isBenchmarkRun) {
        throw new Error(
          "Manual overrides are not allowed during benchmark runs (A4 scope restriction)",
        )
      }

      if (isEvaluationRoute) {
        throw new Error(
          "Manual overrides are not allowed for evaluation routes (A4 scope restriction)",
        )
      }

      if (isToolsRoute) {
        throw new Error(
          "Manual overrides are not allowed for tools routes (A4 scope restriction)",
        )
      }

      if (!isPrimaryGeneration) {
        throw new Error(
          `Manual overrides are only allowed for primary generation role, got: ${request.taskType} (A4 scope restriction)`,
        )
      }

      const overrideRole = getModelRole(request.manualOverrides.role)
      if (overrideRole) {
        const model = getModelRole(
          request.manualOverrides.role || overrideRole.id,
        )
        if (!model) {
          throw new Error(
            `Invalid override role: ${request.manualOverrides.role}`,
          )
        }

        const routingTime = Date.now() - startTime
        assertModelSelectionWithinBudget(
          routingTime,
          `routeRequest(${request.taskType}, override)`,
        )

        return {
          modelRole: model.id,
          adapterKey: request.manualOverrides.adapterKey || model.adapterKey,
          modelRef: request.manualOverrides.modelRef || model.modelRef,
          fallbackChain: model.fallbacks,
          selectedBy: "override",
          latency: routingTime,
          metadata: {
            hasManualOverride: true,
            originalRequest: request.taskType,
            routingTime,
          },
        }
      }
    }

    // Rule-based routing based on task type
    let targetRole: string | null = null

    switch (request.taskType) {
      case "generation":
        targetRole = "primary"
        break
      case "tools":
        targetRole = "tools"
        break
      case "fast":
        targetRole = "fast"
        break
      case "evaluation":
        targetRole = "evaluation"
        break
      case "embedding-local":
        targetRole = "embedding-local"
        break
      case "embedding-remote":
        targetRole = "embedding-remote"
        break
      default:
        throw new Error(`Unsupported task type: ${request.taskType}`)
    }

    const model = getModelRole(targetRole)
    if (!model) {
      throw new Error(`No model configured for role: ${targetRole}`)
    }

    // Check if model has required capabilities for the task
    const requiredCapabilities: Record<TaskType, (keyof ModelCapability)[]> = {
      generation: ["generation", "multilingual"],
      tools: ["toolCalling", "generation", "multilingual"],
      fast: ["generation", "multilingual"],
      evaluation: ["evaluation", "generation", "multilingual"],
      "embedding-local": ["embedding", "multilingual"],
      "embedding-remote": ["embedding", "multilingual"],
    }

    const requiredForTask = requiredCapabilities[request.taskType]
    const hasAllCapabilities = requiredForTask.every(cap =>
      hasCapability(model, cap),
    )

    if (!hasAllCapabilities) {
      throw new Error(
        `Model ${model.id} lacks required capabilities for ${request.taskType}: ${requiredForTask.join(", ")}`,
      )
    }

    const routingTime = Date.now() - startTime
    assertModelSelectionWithinBudget(
      routingTime,
      `routeRequest(${request.taskType}, rule)`,
    )

    return {
      modelRole: model.id,
      adapterKey: model.adapterKey,
      modelRef: model.modelRef,
      fallbackChain: model.fallbacks,
      selectedBy: "rule",
      latency: routingTime,
      metadata: {
        hasManualOverride: false,
        originalRequest: request.taskType,
        routingTime,
      },
    }
  } catch (error) {
    throw new Error(
      `Routing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get best model for specific capability
 */
export function getBestModelForCapability(
  capability: keyof ModelCapability,
): string | null {
  const availableModels = getModelsByCapability(capability)

  if (availableModels.length === 0) {
    return null
  }

  // Return the first available model that has the capability
  // Models are ordered by role priority in the registry
  return availableModels[0]?.id || null
}

/**
 * Check if routing should use local vs remote embedding based on environment
 */
export function shouldUseLocalEmbedding(): boolean {
  const localAdapter =
    process.env.EMBED_MODEL_LOCAL_PROVIDER ||
    process.env.EMBED_MODEL_LOCAL_ADAPTER_KEY
  return process.env.NODE_ENV === "development" && localAdapter === "local"
}
