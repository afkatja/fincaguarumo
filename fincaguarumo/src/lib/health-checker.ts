/**
 * Health Checker and Circuit Breaker for Role-Based Model Provider System
 * Monitors model health, tracks failures, and implements circuit breaker pattern.
 *
 * Provider-agnostic: delegates health checks to the adapter registry
 * instead of importing vendor SDKs directly.
 */

import { getModelRole } from "./model-registry"
import { getAdapter, hasAdapter } from "./adapters/adapter-registry"

export interface HealthCheckResult {
  isHealthy: boolean
  latency?: number
  error?: string
  timestamp: Date
}

export interface CachedHealthCheckResult extends HealthCheckResult {
  expiresAt: Date
  isRecovered: boolean // Track if model is recently recovered
}

export interface CircuitBreakerState {
  isActive: boolean
  failureCount: number
  lastFailureTime: Date
  disableUntil?: Date
  consecutiveFailures: number
  /** Increments each time the breaker arms with a disable window (15 → 30 → 60 min progression). */
  completedBreakerTrips: number
}

export interface HealthMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatency: number
  p95Latency: number
  lastHealthCheck: Date
}

// Circuit breaker state storage (in-memory for now, could be persisted)
const circuitBreakerStates = new Map<string, CircuitBreakerState>()

// Health check result cache storage
const healthCheckCache = new Map<string, CachedHealthCheckResult>()

// Background refresh interval reference
let backgroundRefreshIntervalId: NodeJS.Timeout | null = null

/**
 * Circuit breaker configuration
 */
const CIRCUIT_BREAKER_CONFIG = {
  // Trigger conditions
  maxConsecutiveFailures: 3,
  failureRateWindow: 5 * 60 * 1000, // 5 minutes in milliseconds
  maxFailureRate: 0.5, // 50% failure rate

  // Disable duration progression
  disableDurations: [15, 30, 60], // minutes

  // Health check TTL
  healthCacheTTL: {
    stable: 5 * 60 * 1000, // 5 minutes
    recovered: 2 * 60 * 1000, // 2 minutes
  },

  // Background refresh interval
  backgroundRefreshInterval: 10 * 60 * 1000, // 10 minutes
}

/**
 * Get cached health check result if still valid
 */
function getCachedHealthCheck(roleId: string): CachedHealthCheckResult | null {
  const cached = healthCheckCache.get(roleId)
  if (!cached) {
    return null
  }

  // Check if cache has expired
  if (new Date() > cached.expiresAt) {
    healthCheckCache.delete(roleId)
    return null
  }

  return cached
}

/**
 * Cache health check result with appropriate TTL
 */
function cacheHealthCheckResult(
  roleId: string,
  result: HealthCheckResult,
  forceRefresh: boolean = false,
): void {
  const state = getCircuitBreakerState(roleId)
  const isRecovered = !!(
    (state.consecutiveFailures ?? 0) > 0 ||
    (state.isActive && state.disableUntil && new Date() < state.disableUntil)
  )

  cacheHealthCheckResultWithRecoveryState(
    roleId,
    result,
    isRecovered,
    forceRefresh,
  )
}

/**
 * Cache health check result with explicit recovery state
 * Used when recovery state needs to be captured before circuit breaker updates
 */
function cacheHealthCheckResultWithRecoveryState(
  roleId: string,
  result: HealthCheckResult,
  isRecovered: boolean,
  forceRefresh: boolean = false,
): void {
  // Use recovered TTL (2 min) if model is recently recovered, otherwise stable TTL (5 min)
  const ttl = isRecovered
    ? CIRCUIT_BREAKER_CONFIG.healthCacheTTL.recovered
    : CIRCUIT_BREAKER_CONFIG.healthCacheTTL.stable

  const expiresAt = new Date(Date.now() + ttl)

  healthCheckCache.set(roleId, {
    ...result,
    expiresAt,
    isRecovered,
  })

  if (process.env.NODE_ENV === "development") {
    console.log(
      `💾 Cached health check for ${roleId} (TTL: ${ttl / 1000}s, recovered: ${isRecovered}, force: ${forceRefresh})`,
    )
  }
}

/**
 * Invalidate cache for a specific model (force refresh)
 */
export function invalidateHealthCheckCache(roleId: string): void {
  healthCheckCache.delete(roleId)
  if (process.env.NODE_ENV === "development") {
    console.log(`🗑️ Invalidated health check cache for ${roleId}`)
  }
}

/**
 * Check if circuit breaker is active for a model
 */
export function isCircuitBreakerActive(roleId: string): boolean {
  const state = circuitBreakerStates.get(roleId)
  return state?.isActive || false
}

/**
 * Get circuit breaker state for a model
 */
export function getCircuitBreakerState(roleId: string): CircuitBreakerState {
  return (
    circuitBreakerStates.get(roleId) || {
      isActive: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      consecutiveFailures: 0,
      completedBreakerTrips: 0,
    }
  )
}

/**
 * Arm the circuit breaker with FG-29 disable duration progression:
 * 15 min (first offense), 30 min (second), 60 min (subsequent).
 * Call this when shouldTriggerCircuitBreaker(roleId) is true.
 */
export function armCircuitBreakerWithProgressiveDisable(
  roleId: string,
  partial: Partial<
    Pick<
      CircuitBreakerState,
      "failureCount" | "consecutiveFailures" | "lastFailureTime"
    >
  > = {},
): void {
  const current = getCircuitBreakerState(roleId)
  const tierIndex = Math.min(
    current.completedBreakerTrips ?? 0,
    CIRCUIT_BREAKER_CONFIG.disableDurations.length - 1,
  )
  const minutes = CIRCUIT_BREAKER_CONFIG.disableDurations[tierIndex]
  const disableUntil = new Date(Date.now() + minutes * 60 * 1000)

  updateCircuitBreakerState(roleId, {
    ...partial,
    isActive: true,
    disableUntil,
    completedBreakerTrips: (current.completedBreakerTrips ?? 0) + 1,
  })
}

/**
 * Perform health check on a model — delegates to the adapter
 * Uses TTL caching to avoid excessive health checks
 */
export async function performHealthCheck(
  roleId: string,
  forceRefresh: boolean = false,
  allowLiveCheck: boolean = false,
): Promise<HealthCheckResult> {
  // Check cache first - always use cache on request path unless explicitly allowed
  if (!forceRefresh || !allowLiveCheck) {
    const cached = getCachedHealthCheck(roleId)
    if (cached) {
      return {
        isHealthy: cached.isHealthy,
        latency: cached.latency,
        error: cached.error,
        timestamp: cached.timestamp,
      }
    }
  }

  // If no cache and live checks not allowed (request path), return default healthy
  if (!allowLiveCheck) {
    return {
      isHealthy: true,
      timestamp: new Date(),
    }
  }

  // Capture recovery state before health check (in case it resets on success)
  const stateBeforeCheck = getCircuitBreakerState(roleId)
  const wasRecoveredBeforeCheck = !!(
    (stateBeforeCheck.consecutiveFailures ?? 0) > 0 ||
    (stateBeforeCheck.isActive &&
      stateBeforeCheck.disableUntil &&
      new Date() < stateBeforeCheck.disableUntil)
  )

  const startTime = Date.now()

  try {
    const model = getModelRole(roleId)
    if (!model) {
      return {
        isHealthy: false,
        error: `Model not found: ${roleId}`,
        timestamp: new Date(),
      }
    }

    // Delegate health check to the adapter — no vendor-specific code here
    if (!hasAdapter(model.adapterKey)) {
      return {
        isHealthy: false,
        error: `No adapter registered for key "${model.adapterKey}"`,
        timestamp: new Date(),
      }
    }

    const adapter = getAdapter(model.adapterKey)
    const result = await adapter.healthCheck(model.modelRef)

    if (result.isHealthy) {
      // Update circuit breaker state on success
      updateCircuitBreakerState(roleId, {
        isActive: false,
        failureCount: 0,
        lastFailureTime: new Date(),
        consecutiveFailures: 0,
      })
    } else {
      // Update circuit breaker state on failure
      updateCircuitBreakerState(roleId, {
        isActive: true,
        failureCount: (getCircuitBreakerState(roleId).failureCount || 0) + 1,
        lastFailureTime: new Date(),
        consecutiveFailures:
          (getCircuitBreakerState(roleId).consecutiveFailures || 0) + 1,
      })
    }

    const healthResult: HealthCheckResult = {
      isHealthy: result.isHealthy,
      latency: result.latency ?? Date.now() - startTime,
      error: result.error,
      timestamp: result.timestamp,
    }

    // Cache the result using pre-check recovery state
    cacheHealthCheckResultWithRecoveryState(
      roleId,
      healthResult,
      wasRecoveredBeforeCheck,
      forceRefresh,
    )

    return healthResult
  } catch (error) {
    const latency = Date.now() - startTime

    // Update circuit breaker state on failure
    updateCircuitBreakerState(roleId, {
      isActive: true,
      failureCount: (getCircuitBreakerState(roleId).failureCount || 0) + 1,
      lastFailureTime: new Date(),
      consecutiveFailures:
        (getCircuitBreakerState(roleId).consecutiveFailures || 0) + 1,
    })

    const healthResult: HealthCheckResult = {
      isHealthy: false,
      latency,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }

    // Cache the failure result using pre-check recovery state
    cacheHealthCheckResultWithRecoveryState(
      roleId,
      healthResult,
      wasRecoveredBeforeCheck,
      forceRefresh,
    )

    return healthResult
  }
}

/**
 * Update circuit breaker state after a request attempt
 * Force refreshes health check cache on circuit breaker events
 */
export function updateCircuitBreakerState(
  roleId: string,
  update: Partial<CircuitBreakerState>,
): void {
  const currentState = getCircuitBreakerState(roleId)
  const newState = { ...currentState, ...update }

  circuitBreakerStates.set(roleId, newState)

  // Force refresh health check cache on circuit breaker events
  if (
    update.isActive === true ||
    (update.consecutiveFailures !== undefined &&
      update.consecutiveFailures > (currentState.consecutiveFailures ?? 0))
  ) {
    invalidateHealthCheckCache(roleId)
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`🔧 Circuit breaker state updated for ${roleId}:`, {
      isActive: newState.isActive,
      failureCount: newState.failureCount,
      consecutiveFailures: newState.consecutiveFailures,
      completedBreakerTrips: newState.completedBreakerTrips,
      disableUntil: newState.disableUntil,
    })
  }
}

/**
 * Check if request should be allowed based on circuit breaker state
 * In serverless environments, circuit breaker is ineffective due to state reset
 * Always allow requests - rely on fallback chain for resilience
 */
export function shouldAllowRequest(roleId: string): boolean {
  // In serverless, circuit breaker state resets on cold start
  // The fallback chain in model registry provides the real resilience
  return true
}

/**
 * Record successful request
 */
export function recordSuccessfulRequest(roleId: string, latency: number): void {
  const state = getCircuitBreakerState(roleId)

  // Reset consecutive failures on success
  if (state.consecutiveFailures > 0) {
    updateCircuitBreakerState(roleId, {
      ...state,
      consecutiveFailures: 0,
    })
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`✅ Successful request to ${roleId} in ${latency}ms`)
  }
}

/**
 * Record failed request
 */
export function recordFailedRequest(roleId: string, error: string): void {
  const state = getCircuitBreakerState(roleId)
  const currentConsecutiveFailures = state.consecutiveFailures || 0

  updateCircuitBreakerState(roleId, {
    ...state,
    failureCount: (state.failureCount || 0) + 1,
    lastFailureTime: new Date(),
    consecutiveFailures: currentConsecutiveFailures + 1,
  })

  if (process.env.NODE_ENV === "development") {
    console.log(`❌ Failed request to ${roleId}: ${error}`)
  }
}

/**
 * Check if circuit breaker should be triggered
 */
export function shouldTriggerCircuitBreaker(roleId: string): boolean {
  const state = getCircuitBreakerState(roleId)

  if (!state) return false

  // Trigger conditions
  const consecutiveFailures = state.consecutiveFailures || 0
  const timeSinceLastFailure = state.lastFailureTime
    ? Date.now() - state.lastFailureTime.getTime()
    : Infinity

  // Check consecutive failures
  if (consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures) {
    return true
  }

  // Check failure rate in window
  if (timeSinceLastFailure <= CIRCUIT_BREAKER_CONFIG.failureRateWindow) {
    const totalFailures = state.failureCount || 0
    const failureRate =
      totalFailures /
      (CIRCUIT_BREAKER_CONFIG.failureRateWindow / (5 * 60 * 1000))

    if (failureRate >= CIRCUIT_BREAKER_CONFIG.maxFailureRate) {
      return true
    }
  }

  return false
}

/**
 * Get health metrics for monitoring
 */
export function getHealthMetrics(roleId: string): HealthMetrics {
  const state = getCircuitBreakerState(roleId)

  // This would typically be stored in a metrics system
  // For now, return basic metrics based on circuit breaker state
  return {
    totalRequests: state.failureCount || 0,
    successfulRequests: Math.max(
      0,
      (state.failureCount || 0) - (state.consecutiveFailures || 0),
    ),
    failedRequests: state.consecutiveFailures || 0,
    averageLatency: 0, // Would be calculated from actual request data
    p95Latency: 0, // Would be calculated from actual request data
    lastHealthCheck: new Date(),
  }
}

/**
 * Reset circuit breaker state (for testing or manual recovery)
 */
export function resetCircuitBreaker(roleId: string): void {
  circuitBreakerStates.delete(roleId)
  if (process.env.NODE_ENV === "development") {
    console.log(`🔄 Circuit breaker reset for ${roleId}`)
  }
}

/**
 * Get all circuit breaker states (for monitoring)
 */
export function getAllCircuitBreakerStates(): Record<
  string,
  CircuitBreakerState
> {
  const result: Record<string, CircuitBreakerState> = {}

  circuitBreakerStates.forEach((state, roleId) => {
    result[roleId] = state
  })

  return result
}

/**
 * Start background health check refresh for all registered models
 * Runs every 10 minutes regardless of cache state
 */
export function startBackgroundRefresh(): void {
  if (backgroundRefreshIntervalId) {
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ Background refresh already running")
    }
    return
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `🔄 Starting background health check refresh (interval: ${CIRCUIT_BREAKER_CONFIG.backgroundRefreshInterval / 1000}s)`,
    )
  }

  backgroundRefreshIntervalId = setInterval(async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Running background health check refresh...")
    }

    // Get all registered model roles
    const { getModelRoles } = require("./model-registry")
    const modelRoles = getModelRoles()

    // Refresh health check for each model
    for (const [roleId, model] of Object.entries(modelRoles)) {
      try {
        await performHealthCheck(roleId, true, true) // force refresh with live check
        if (process.env.NODE_ENV === "development") {
          console.log(`✅ Background refresh completed for ${roleId}`)
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(`❌ Background refresh failed for ${roleId}:`, error)
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Background health check refresh cycle completed")
    }
  }, CIRCUIT_BREAKER_CONFIG.backgroundRefreshInterval)
}

/**
 * Stop background health check refresh
 */
export function stopBackgroundRefresh(): void {
  if (backgroundRefreshIntervalId) {
    clearInterval(backgroundRefreshIntervalId)
    backgroundRefreshIntervalId = null
    if (process.env.NODE_ENV === "development") {
      console.log("⏹️ Stopped background health check refresh")
    }
  }
}

/**
 * Get health check cache status (for monitoring)
 */
export function getHealthCheckCacheStatus(): Record<
  string,
  { isCached: boolean; expiresAt: Date | null; isRecovered: boolean }
> {
  const result: Record<
    string,
    { isCached: boolean; expiresAt: Date | null; isRecovered: boolean }
  > = {}

  healthCheckCache.forEach((cached, roleId) => {
    result[roleId] = {
      isCached: true,
      expiresAt: cached.expiresAt,
      isRecovered: cached.isRecovered,
    }
  })

  return result
}
