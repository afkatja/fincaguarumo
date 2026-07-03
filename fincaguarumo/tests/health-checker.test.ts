/**
 * Tests for health check TTL caching mechanism
 * Spec: FG-29-role-based-model-provider.md
 */

import {
  performHealthCheck,
  invalidateHealthCheckCache,
  startBackgroundRefresh,
  stopBackgroundRefresh,
  getHealthCheckCacheStatus,
  resetCircuitBreaker,
  getCircuitBreakerState,
  updateCircuitBreakerState,
  armCircuitBreakerWithProgressiveDisable,
  shouldAllowRequest,
} from "../src/lib/health-checker"

// Mock the model registry and adapter registry
jest.mock("../src/lib/model-registry", () => ({
  getModelRole: jest.fn(),
  getModelRoles: jest.fn(() => ({})),
}))

jest.mock("../src/lib/adapters/adapter-registry", () => ({
  getAdapter: jest.fn(),
  hasAdapter: jest.fn(() => true),
}))

describe("Health Check TTL Caching", () => {
  const mockRoleId = "test-model-role"

  beforeEach(() => {
    // Reset circuit breaker state before each test
    resetCircuitBreaker(mockRoleId)
    invalidateHealthCheckCache(mockRoleId)
    jest.clearAllMocks()
  })

  afterEach(() => {
    stopBackgroundRefresh()
  })

  describe("Cache storage and retrieval", () => {
    it("should cache health check results with appropriate TTL", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // First call should perform actual health check
      const result1 = await performHealthCheck(mockRoleId)
      expect(result1.isHealthy).toBe(true)

      // Second call should use cached result
      const result2 = await performHealthCheck(mockRoleId)
      expect(result2.isHealthy).toBe(true)

      // Adapter should only be called once due to caching
      expect(getAdapter().healthCheck).toHaveBeenCalledTimes(1)
    })

    it("should expire cache after TTL", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // First call
      await performHealthCheck(mockRoleId)

      // Directly invalidate cache to simulate expiry
      invalidateHealthCheckCache(mockRoleId)

      // Second call should perform new health check since cache expired
      await performHealthCheck(mockRoleId)

      // Adapter should be called twice (first call + after expiry)
      expect(getAdapter().healthCheck).toHaveBeenCalledTimes(2)
    })
  })

  describe("Stable vs recovered TTL", () => {
    it("should use 5-minute TTL for stable models", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // Perform health check on stable model (no failures)
      await performHealthCheck(mockRoleId)

      const cacheStatus = getHealthCheckCacheStatus()
      const cachedEntry = cacheStatus[mockRoleId]

      expect(cachedEntry).toBeDefined()
      expect(cachedEntry.isRecovered).toBe(false)

      // Check TTL is approximately 5 minutes (300000ms)
      if (cachedEntry.expiresAt) {
        const ttl = cachedEntry.expiresAt.getTime() - Date.now()
        expect(ttl).toBeGreaterThan(290000) // Allow some margin
        expect(ttl).toBeLessThan(310000)
      }
    })

    it("should use 2-minute TTL for recovered models", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // Simulate model recovery by setting consecutive failures
      updateCircuitBreakerState(mockRoleId, {
        consecutiveFailures: 1,
        isActive: false,
      })

      // Perform health check on recovered model
      await performHealthCheck(mockRoleId)

      const cacheStatus = getHealthCheckCacheStatus()
      const cachedEntry = cacheStatus[mockRoleId]

      expect(cachedEntry).toBeDefined()
      expect(cachedEntry.isRecovered).toBe(true)

      // Check TTL is approximately 2 minutes (120000ms)
      if (cachedEntry.expiresAt) {
        const ttl = cachedEntry.expiresAt.getTime() - Date.now()
        expect(ttl).toBeGreaterThan(110000) // Allow some margin
        expect(ttl).toBeLessThan(130000)
      }
    })
  })

  describe("Force refresh on circuit breaker events", () => {
    it("should invalidate cache when circuit breaker is triggered", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // Perform health check to populate cache
      await performHealthCheck(mockRoleId)

      let cacheStatus = getHealthCheckCacheStatus()
      expect(cacheStatus[mockRoleId]).toBeDefined()

      // Trigger circuit breaker event
      updateCircuitBreakerState(mockRoleId, {
        isActive: true,
        consecutiveFailures: 3,
      })

      // Cache should be invalidated
      cacheStatus = getHealthCheckCacheStatus()
      expect(cacheStatus[mockRoleId]).toBeUndefined()
    })

    it("should force refresh when explicitly requested", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // First call
      await performHealthCheck(mockRoleId)

      // Force refresh should bypass cache
      await performHealthCheck(mockRoleId, true)

      // Adapter should be called twice (normal + force refresh)
      expect(getAdapter().healthCheck).toHaveBeenCalledTimes(2)
    })
  })

  describe("Background refresh mechanism", () => {
    it("should start background refresh interval", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation()

      startBackgroundRefresh()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Starting background health check refresh"),
      )

      consoleSpy.mockRestore()
    })

    it("should not start multiple background refresh intervals", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation()

      startBackgroundRefresh()
      startBackgroundRefresh() // Second call should be ignored

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Background refresh already running"),
      )

      consoleSpy.mockRestore()
      stopBackgroundRefresh()
    })

    it("should stop background refresh interval", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation()

      startBackgroundRefresh()
      stopBackgroundRefresh()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Stopped background health check refresh"),
      )

      consoleSpy.mockRestore()
    })
  })

  describe("Cache status monitoring", () => {
    it("should return cache status for monitoring", async () => {
      const { getModelRole } = require("../src/lib/model-registry")
      const { getAdapter } = require("../src/lib/adapters/adapter-registry")

      getModelRole.mockReturnValue({
        adapterKey: "test-adapter",
        modelRef: "test-model",
      })

      getAdapter.mockReturnValue({
        healthCheck: jest.fn().mockResolvedValue({
          isHealthy: true,
          latency: 100,
          timestamp: new Date(),
        }),
      })

      // Perform health check to populate cache
      await performHealthCheck(mockRoleId)

      const cacheStatus = getHealthCheckCacheStatus()

      expect(cacheStatus[mockRoleId]).toBeDefined()
      expect(cacheStatus[mockRoleId].isCached).toBe(true)
      expect(cacheStatus[mockRoleId].expiresAt).toBeInstanceOf(Date)
      expect(typeof cacheStatus[mockRoleId].isRecovered).toBe("boolean")
    })

    it("should return empty status when no cache exists", () => {
      const cacheStatus = getHealthCheckCacheStatus()

      expect(cacheStatus[mockRoleId]).toBeUndefined()
    })
  })

  describe("Circuit breaker disable duration progression (FG-29)", () => {
    const MINUTE_MS = 60 * 1000

    it("uses 15 minutes on first trip", () => {
      resetCircuitBreaker(mockRoleId)
      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })

      const { disableUntil, completedBreakerTrips } =
        getCircuitBreakerState(mockRoleId)
      expect(completedBreakerTrips).toBe(1)
      expect(disableUntil).toBeDefined()
      const span = disableUntil!.getTime() - Date.now()
      expect(span).toBeGreaterThan(14 * MINUTE_MS)
      expect(span).toBeLessThanOrEqual(16 * MINUTE_MS)
    })

    it("uses 30 minutes on second trip after disable expires", () => {
      jest.useFakeTimers()
      resetCircuitBreaker(mockRoleId)
      const t0 = new Date("2026-01-01T12:00:00.000Z")
      jest.setSystemTime(t0)

      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })
      let state = getCircuitBreakerState(mockRoleId)
      expect(state.disableUntil!.getTime() - t0.getTime()).toBe(15 * MINUTE_MS)

      jest.setSystemTime(new Date(t0.getTime() + 15 * MINUTE_MS + 1))
      expect(shouldAllowRequest(mockRoleId)).toBe(true)

      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })
      state = getCircuitBreakerState(mockRoleId)
      expect(state.completedBreakerTrips).toBe(2)
      expect(state.disableUntil!.getTime() - Date.now()).toBe(30 * MINUTE_MS)

      jest.useRealTimers()
    })

    it("uses 60 minutes on third and later trips", () => {
      jest.useFakeTimers()
      resetCircuitBreaker(mockRoleId)
      const t0 = new Date("2026-01-01T12:00:00.000Z")
      jest.setSystemTime(t0)

      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })
      jest.setSystemTime(new Date(t0.getTime() + 15 * MINUTE_MS + 1))
      shouldAllowRequest(mockRoleId)

      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })
      jest.setSystemTime(new Date(t0.getTime() + 15 * MINUTE_MS + 30 * MINUTE_MS + 2))
      shouldAllowRequest(mockRoleId)

      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })
      let state = getCircuitBreakerState(mockRoleId)
      expect(state.completedBreakerTrips).toBe(3)
      expect(state.disableUntil!.getTime() - Date.now()).toBe(60 * MINUTE_MS)

      jest.setSystemTime(new Date(state.disableUntil!.getTime() + 1))
      shouldAllowRequest(mockRoleId)

      armCircuitBreakerWithProgressiveDisable(mockRoleId, {
        lastFailureTime: new Date(),
      })
      state = getCircuitBreakerState(mockRoleId)
      expect(state.completedBreakerTrips).toBe(4)
      expect(state.disableUntil!.getTime() - Date.now()).toBe(60 * MINUTE_MS)

      jest.useRealTimers()
    })
  })
})
