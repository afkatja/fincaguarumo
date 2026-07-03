/**
 * Custom batch API integration for cost-optimized semantic RAG
 * Uses async batch processing with Redis storage for persistence
 */

interface BatchJob {
  id: string
  queries: string[]
  pageContext: { page: string; slug?: string; locale: string }
  options: any
  createdAt: Date
  status: "pending" | "processing" | "completed" | "failed"
  result?: any
  error?: string
}

// Load environment variables for Redis configuration
import "dotenv/config"

import Redis, { type RedisOptions } from "ioredis"

// Redis client for batch job storage
const batchRedis = new Redis(getRedisConfig())

// Handle Redis connection errors gracefully
batchRedis.on("error", (error: Error) => {
  console.error("Batch API Redis connection error:", error)
})

// Add connection state tracking
let isRedisConnected = false

batchRedis.on("connect", () => {
  isRedisConnected = true
  console.log("✅ Batch API Redis connected")
})

batchRedis.on("close", () => {
  isRedisConnected = false
  console.warn("🔴 Batch API Redis connection closed")
})

batchRedis.on("reconnecting", () => {
  console.log("🔄 Batch API Redis reconnecting...")
})

/**
 * Get Redis configuration (reuses pattern from rate limiting)
 */
function getRedisConfig(): RedisOptions {
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
      commandTimeout: 5000, // 5 seconds command timeout
      connectTimeout: 5000, // 5 seconds connection timeout
    }
  }

  // Default configuration for local development
  return {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    commandTimeout: 5000, // 5 seconds command timeout
    connectTimeout: 5000, // 5 seconds connection timeout
  }
}

/**
 * Serialize batch job for Redis storage
 */
function serializeBatchJob(job: BatchJob): string {
  return JSON.stringify({
    ...job,
    createdAt: job.createdAt.toISOString(),
  })
}

/**
 * Deserialize batch job from Redis storage
 */
function deserializeBatchJob(data: string): BatchJob {
  const parsed = JSON.parse(data)
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
  }
}

/**
 * Check if Redis is available and connected
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    if (!isRedisConnected) {
      // Try to ping Redis to check connection
      await batchRedis.ping()
      isRedisConnected = true
    }
    return true
  } catch (error) {
    isRedisConnected = false
    console.warn("Redis connection check failed:", error)
    return false
  }
}

/**
 * Submit semantic RAG context building as a batch job
 */
export async function submitBatchRAGJob(
  queries: string[],
  pageContext: { page: string; slug?: string; locale: string },
  options: any = {},
): Promise<string> {
  // Check Redis connection first
  const isRedisAvailable = await checkRedisConnection()
  if (!isRedisAvailable) {
    throw new Error("Redis is not available for batch processing")
  }

  const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  const batchJob: BatchJob = {
    id: jobId,
    queries,
    pageContext,
    options,
    createdAt: new Date(),
    status: "pending",
  }

  try {
    // Store in Redis with TTL of 24 hours
    await batchRedis.setex(
      `batch_job:${jobId}`,
      24 * 60 * 60, // 24 hours in seconds
      serializeBatchJob(batchJob),
    )
  } catch (error) {
    console.error(`Failed to store batch job ${jobId}:`, error)
    throw new Error("Failed to create batch job")
  }

  // Process the batch asynchronously
  processBatchJob(jobId).catch(error => {
    console.error(`Batch job ${jobId} failed:`, error)
    // Update job status in Redis
    updateJobStatus(
      jobId,
      "failed",
      error instanceof Error ? error.message : "Unknown error",
    )
  })

  return jobId
}

/**
 * Update job status in Redis
 */
async function updateJobStatus(
  jobId: string,
  status: BatchJob["status"],
  error?: string,
  result?: any,
): Promise<void> {
  try {
    const existingData = await batchRedis.get(`batch_job:${jobId}`)
    if (!existingData) return

    const job = deserializeBatchJob(existingData)
    job.status = status
    if (error) job.error = error
    if (result) job.result = result

    await batchRedis.setex(
      `batch_job:${jobId}`,
      24 * 60 * 60,
      serializeBatchJob(job),
    )
  } catch (redisError) {
    console.error(`Failed to update job ${jobId}:`, redisError)
  }
}

/**
 * Get batch job status and results
 */
export async function getBatchJob(
  jobId: string,
): Promise<BatchJob | undefined> {
  try {
    const data = await batchRedis.get(`batch_job:${jobId}`)
    return data ? deserializeBatchJob(data) : undefined
  } catch (error) {
    console.error(`Failed to get batch job ${jobId}:`, error)
    return undefined
  }
}

/**
 * Get all batch jobs (for monitoring)
 */
export async function getAllBatchJobs(): Promise<BatchJob[]> {
  try {
    const keys = await batchRedis.keys("batch_job:*")
    if (!keys.length) return []

    const pipeline = batchRedis.pipeline()
    keys.forEach(key => pipeline.get(key))
    const results = await pipeline.exec()

    if (!results) return []

    return results
      .map(([err, data]) =>
        data && typeof data === "string" ? deserializeBatchJob(data) : null,
      )
      .filter((job): job is BatchJob => job !== null)
  } catch (error) {
    console.error("Failed to get all batch jobs:", error)
    return []
  }
}

/**
 * Process a batch job asynchronously
 */
async function processBatchJob(jobId: string): Promise<void> {
  try {
    const jobData = await batchRedis.get(`batch_job:${jobId}`)
    if (!jobData) {
      throw new Error(`Batch job ${jobId} not found`)
    }

    const job = deserializeBatchJob(jobData)
    await updateJobStatus(jobId, "processing")

    // Import here to avoid circular dependencies
    const { buildBatchSemanticRAGContext } =
      await import("./semantic-context-builder")

    // Process queries in smaller chunks to control costs
    const chunkSize = 3 // Process 3 queries at a time
    const results: any[] = []

    for (let i = 0; i < job.queries.length; i += chunkSize) {
      const chunk = job.queries.slice(i, i + chunkSize)

      // Add delay between chunks to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const chunkResults = await buildBatchSemanticRAGContext(
        chunk,
        job.pageContext,
        job.options,
      )

      results.push(...chunkResults)
    }

    await updateJobStatus(jobId, "completed", undefined, results)
  } catch (error) {
    await updateJobStatus(
      jobId,
      "failed",
      error instanceof Error ? error.message : "Unknown error",
    )
    throw error
  }
}

/**
 * Clean up old completed jobs (older than 1 hour)
 */
export async function cleanupOldBatchJobs(): Promise<void> {
  try {
    const keys = await batchRedis.keys("batch_job:*")
    if (!keys.length) return

    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const keysToDelete: string[] = []

    // Check each job's age and status
    for (const key of keys) {
      const data = await batchRedis.get(key)
      if (!data) continue

      const job = deserializeBatchJob(data)
      if (
        (job.status === "completed" || job.status === "failed") &&
        job.createdAt.getTime() < oneHourAgo
      ) {
        keysToDelete.push(key)
      }
    }

    // Delete old jobs
    if (keysToDelete.length > 0) {
      await batchRedis.del(...keysToDelete)
      console.log(`Cleaned up ${keysToDelete.length} old batch jobs`)
    }
  } catch (error) {
    console.error("Failed to cleanup old batch jobs:", error)
  }
}

/**
 * Get batch job statistics
 */
export async function getBatchJobStats(): Promise<{
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
}> {
  try {
    const jobs = await getAllBatchJobs()

    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === "pending").length,
      processing: jobs.filter(j => j.status === "processing").length,
      completed: jobs.filter(j => j.status === "completed").length,
      failed: jobs.filter(j => j.status === "failed").length,
    }
  } catch (error) {
    console.error("Failed to get batch job stats:", error)
    return {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }
  }
}

// Auto-cleanup old jobs every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupOldBatchJobs, 10 * 60 * 1000)
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function disconnectBatchRedis(): Promise<void> {
  await batchRedis.quit()
}
