// Load environment variables for Redis configuration
import "dotenv/config"

import Redis, { type RedisOptions } from "ioredis"

// Redis-based distributed rate limiting implementation
// Addresses OWASP A04 - Insecure Design vulnerability

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Redis key prefix
}

interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
  totalRequests: number
}

class RedisRateLimiter {
  private redis: Redis
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: "rate_limit:",
      ...config,
    }

    // Initialize Redis connection with environment-based configuration
    this.redis = new Redis(this.getRedisConfig())

    // Handle Redis connection errors gracefully
    this.redis.on("error", (error: Error) => {
      console.error("Redis rate limiter connection error:", error)
    })
  }

  private getRedisConfig(): RedisOptions {
    // Support multiple Redis deployment options
    const redisUrl = process.env.REDIS_URL
    const redisHost = process.env.REDIS_HOST
    const redisPort = process.env.REDIS_PORT
    const redisPassword = process.env.REDIS_PASSWORD

    if (redisUrl && redisUrl.trim() !== "") {
      return redisUrl as RedisOptions
    }

    if (
      redisHost &&
      redisHost.trim() !== "" &&
      redisPort &&
      redisPort.trim() !== ""
    ) {
      return {
        host: redisHost,
        port: parseInt(redisPort, 10),
        password: redisPassword,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      }
    }

    // Default configuration for local development
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    }
  }

  /**
   * Check if a request is allowed based on rate limit
   * Uses Redis sliding window algorithm with atomic operations
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    try {
      const key = `${this.config.keyPrefix}${identifier}`
      const now = Date.now()
      const windowStart = now - this.config.windowMs

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline()

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart)

      // Count current requests in window
      pipeline.zcard(key)

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`)

      // Set expiration for cleanup
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000))

      const results = await pipeline.exec()

      if (!results) {
        throw new Error("Redis pipeline execution failed")
      }

      const [, removedCount] = results[0]
      const [, currentCount] = results[1]
      const [, addedCount] = results[2]
      const [, expireResult] = results[3]

      const totalRequests = (currentCount as number) + (addedCount as number)
      const allowed = totalRequests <= this.config.maxRequests
      const remainingRequests = Math.max(
        0,
        this.config.maxRequests - totalRequests,
      )
      const resetTime = now + this.config.windowMs

      return {
        allowed,
        remainingRequests,
        resetTime,
        totalRequests,
      }
    } catch (error) {
      console.error("Redis rate limiting error:", error)

      // Fail open: allow request if Redis is unavailable
      // This prevents the application from breaking due to rate limiting issues
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        totalRequests: 0,
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      const key = `${this.config.keyPrefix}${identifier}`
      await this.redis.del(key)
    } catch (error) {
      console.error("Failed to reset rate limit:", error)
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(identifier: string): Promise<RateLimitResult> {
    try {
      const key = `${this.config.keyPrefix}${identifier}`
      const now = Date.now()
      const windowStart = now - this.config.windowMs

      // Count requests in current window without adding new one
      const pipeline = this.redis.pipeline()
      pipeline.zremrangebyscore(key, 0, windowStart)
      pipeline.zcard(key)

      const results = await pipeline.exec()

      if (!results) {
        throw new Error("Redis pipeline execution failed")
      }

      const [, currentCount] = results[1]
      const totalRequests = currentCount as number
      const allowed = totalRequests <= this.config.maxRequests
      const remainingRequests = Math.max(
        0,
        this.config.maxRequests - totalRequests,
      )
      const resetTime = now + this.config.windowMs

      return {
        allowed,
        remainingRequests,
        resetTime,
        totalRequests,
      }
    } catch (error) {
      console.error("Failed to get rate limit status:", error)
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        totalRequests: 0,
      }
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit()
  }

  /**
   * Health check for Redis connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch (error) {
      console.error("Redis health check failed:", error)
      return false
    }
  }
}

// Rate limiter instances for different API endpoints
export const embeddingsRateLimiter = new RedisRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 50, // 50 requests per minute
  keyPrefix: "embeddings_rate_limit:",
})

export const contactRateLimiter = new RedisRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute for contact form
  keyPrefix: "contact_rate_limit:",
})

export const bookingsRateLimiter = new RedisRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 30, // 30 requests per minute for bookings
  keyPrefix: "bookings_rate_limit:",
})

// Export the class for custom configurations
export { RedisRateLimiter }
export type { RateLimitConfig, RateLimitResult }
