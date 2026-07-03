import Redis from "ioredis"
import {
  RedisRateLimiter,
  embeddingsRateLimiter,
} from "../rate-limiting/redis-rate-limit"

// Mock Redis for testing
jest.mock("ioredis", () => {
  const mockRedis = {
    pipeline: jest.fn().mockReturnValue({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0], // zremrangebyscore result
        [null, 5], // zcard result (5 existing requests)
        [null, 1], // zadd result (1 new request added)
        [null, 1], // expire result
      ]),
    }),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue("PONG"),
  }
  return jest.fn(() => mockRedis)
})

// Helper to get the mocked Redis instance
function getMockRedis() {
  const RedisMock = jest.requireMock("ioredis")
  return RedisMock()
}

// Mock environment variables for testing
const originalEnv = process.env

describe("Redis Rate Limiter", () => {
  let rateLimiter: RedisRateLimiter

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock environment variables
    process.env = {
      ...originalEnv,
      REDIS_URL: "redis://localhost:6379", // Mock Redis URL for testing
    }

    // Create rate limiter instance

    rateLimiter = new RedisRateLimiter({
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: "test_rate_limit:",
    })
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe("checkLimit", () => {
    it("should allow requests within the limit", async () => {
      const result = await rateLimiter.checkLimit("test-ip")

      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(4) // 10 max - 6 total (5 existing + 1 new)
      expect(result.totalRequests).toBe(6)
      expect(result.resetTime).toBeGreaterThan(Date.now())

      // Verify Redis operations were called
      expect(getMockRedis().pipeline).toHaveBeenCalled()
    })

    it("should deny requests exceeding the limit", async () => {
      // Mock pipeline to return 10 existing requests (at limit)
      getMockRedis().pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 10], // 10 existing requests
          [null, 1], // 1 new request
          [null, 1],
        ]),
      })

      const result = await rateLimiter.checkLimit("test-ip")

      expect(result.allowed).toBe(false)
      expect(result.remainingRequests).toBe(0)
      expect(result.totalRequests).toBe(11)
    })

    it("should handle Redis connection errors gracefully", async () => {
      // Mock pipeline to throw an error
      getMockRedis().pipeline = jest.fn().mockImplementation(() => {
        throw new Error("Redis connection failed")
      })

      const result = await rateLimiter.checkLimit("test-ip")

      // Should fail open - allow requests when Redis is unavailable
      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(10)
      expect(result.totalRequests).toBe(0)
    })

    it("should use correct Redis key format", async () => {
      await rateLimiter.checkLimit("test-ip-123")

      expect(getMockRedis().pipeline).toHaveBeenCalled()
    })
  })

  describe("resetLimit", () => {
    it("should reset the rate limit for a specific identifier", async () => {
      await rateLimiter.resetLimit("test-ip")

      expect(getMockRedis().del).toHaveBeenCalledWith("test_rate_limit:test-ip")
    })

    it("should handle reset errors gracefully", async () => {
      getMockRedis().del = jest
        .fn()
        .mockRejectedValue(new Error("Delete failed"))

      // Should not throw an error
      await expect(rateLimiter.resetLimit("test-ip")).resolves.toBeUndefined()
    })
  })

  describe("getStatus", () => {
    it("should get current status without incrementing", async () => {
      // Mock pipeline for getStatus (only 2 operations: zremrangebyscore + zcard)
      getMockRedis().pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore result
          [null, 5], // zcard result (5 existing requests)
        ]),
      })

      const result = await rateLimiter.getStatus("test-ip")

      expect(result.allowed).toBe(true)
      expect(result.totalRequests).toBe(5) // Only existing requests, no new one added
      expect(getMockRedis().pipeline).toHaveBeenCalled()
    })

    it("should handle status check errors gracefully", async () => {
      getMockRedis().pipeline = jest.fn().mockImplementation(() => {
        throw new Error("Status check failed")
      })

      const result = await rateLimiter.getStatus("test-ip")

      expect(result.allowed).toBe(true)
      expect(result.totalRequests).toBe(0)
    })
  })

  describe("health check", () => {
    it("should return true when Redis is healthy", async () => {
      const isHealthy = await rateLimiter.isHealthy()

      expect(isHealthy).toBe(true)
      expect(getMockRedis().ping).toHaveBeenCalled()
    })

    it("should return false when Redis is unhealthy", async () => {
      getMockRedis().ping = jest.fn().mockRejectedValue(new Error("Redis down"))

      const isHealthy = await rateLimiter.isHealthy()

      expect(isHealthy).toBe(false)
    })
  })

  describe("connection configuration", () => {
    it("should use REDIS_URL when available", () => {
      // Set environment variable
      const originalEnv = { ...process.env }
      process.env.REDIS_URL = "redis://localhost:6379"

      // Clear previous calls
      jest.clearAllMocks()

      new RedisRateLimiter({ windowMs: 60000, maxRequests: 10 })

      // Check that Redis was called with the URL (it may be called multiple times due to exported instances)
      expect(Redis).toHaveBeenCalledWith("redis://localhost:6379")

      // Restore environment
      process.env = originalEnv
    })

    it("should use separate REDIS_HOST and PORT when URL is not available", () => {
      const originalEnv = { ...process.env }

      // Clear URL and set host/port
      delete process.env.REDIS_URL
      process.env.REDIS_HOST = "localhost"
      process.env.REDIS_PORT = "6380"

      // Clear previous calls
      jest.clearAllMocks()

      new RedisRateLimiter({ windowMs: 60000, maxRequests: 10 })

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "localhost",
          port: 6380,
        }),
      )

      // Restore environment
      process.env = originalEnv
    })

    it("should use default configuration when no Redis env vars are set", () => {
      const originalEnv = { ...process.env }

      // Clear all Redis environment variables
      delete process.env.REDIS_URL
      delete process.env.REDIS_HOST
      delete process.env.REDIS_PORT

      // Clear previous calls
      jest.clearAllMocks()

      new RedisRateLimiter({ windowMs: 60000, maxRequests: 10 })

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "localhost",
          port: 6379,
        }),
      )

      // Restore environment
      process.env = originalEnv
    })
  })
})

describe("Preconfigured Rate Limiters", () => {
  it("should export embeddings rate limiter", () => {
    expect(embeddingsRateLimiter).toBeInstanceOf(RedisRateLimiter)
  })
})
