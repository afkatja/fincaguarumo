import { DatabaseOperationResult, MonitoringMetrics } from "./types"
import { MONITORING_CONFIG } from "./config"

// In-memory storage for monitoring metrics
const metrics: MonitoringMetrics[] = []
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Starts the cleanup interval for old metrics
 */
function startCleanup(): void {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const cutoffTime = Date.now() - MONITORING_CONFIG.metricsRetentionMs
    const initialCount = metrics.length

    // Remove old metrics
    for (let i = metrics.length - 1; i >= 0; i--) {
      if (metrics[i].timestamp.getTime() < cutoffTime) {
        metrics.splice(i, 1)
      }
    }

    // If we still have too many metrics, remove the oldest
    if (metrics.length > MONITORING_CONFIG.maxMetricsCount) {
      const excess = metrics.length - MONITORING_CONFIG.maxMetricsCount
      metrics.splice(0, excess)
    }

    const removedCount = initialCount - metrics.length
    if (removedCount > 0) {
      console.log(
        `🧹 Cleaned up ${removedCount} old monitoring metrics (${metrics.length} remaining)`,
      )
    }
  }, MONITORING_CONFIG.cleanupIntervalMs)
}

/**
 * Records a database operation result
 */
export function recordDatabaseOperation(result: DatabaseOperationResult): void {
  // Start cleanup on first operation
  if (!cleanupInterval) {
    startCleanup()
  }

  const metric: MonitoringMetrics = {
    operation: `${result.operation}:${result.table}`,
    success: result.success,
    error: result.error,
    timestamp: result.timestamp,
    duration: undefined, // We're not tracking duration for now
  }

  metrics.push(metric)

  // Log the operation
  if (result.success) {
    console.log(`✅ DB Operation: ${result.operation} on ${result.table}`)
  } else {
    console.error(
      `❌ DB Operation Failed: ${result.operation} on ${result.table} - ${result.error}`,
    )
  }
}

/**
 * Wraps a database operation with monitoring
 */
export async function withDatabaseMonitoring<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
): Promise<{ success: boolean; data?: T; error?: string }> {
  const startTime = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    recordDatabaseOperation({
      success: true,
      operation,
      table,
      timestamp: new Date(),
    })

    console.log(`✅ DB ${operation} on ${table} completed in ${duration}ms`)

    return { success: true, data: result }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    recordDatabaseOperation({
      success: false,
      operation,
      table,
      error: errorMessage,
      timestamp: new Date(),
    })

    console.error(
      `❌ DB ${operation} on ${table} failed after ${duration}ms: ${errorMessage}`,
    )

    return { success: false, error: errorMessage }
  }
}

/**
 * Gets monitoring statistics for database operations
 */
export function getDatabaseStats(): {
  totalOperations: number
  successRate: number
  operationCounts: Record<string, { success: number; failure: number }>
  recentFailures: Array<{ operation: string; error: string; timestamp: Date }>
} {
  const totalOperations = metrics.length
  const successCount = metrics.filter(m => m.success).length
  const successRate =
    totalOperations > 0 ? (successCount / totalOperations) * 100 : 0

  // Group by operation
  const operationCounts: Record<string, { success: number; failure: number }> =
    {}

  metrics.forEach(metric => {
    if (!operationCounts[metric.operation]) {
      operationCounts[metric.operation] = { success: 0, failure: 0 }
    }

    if (metric.success) {
      operationCounts[metric.operation].success++
    } else {
      operationCounts[metric.operation].failure++
    }
  })

  // Get recent failures (last 10)
  const recentFailures = metrics
    .filter(m => !m.success)
    .slice(-10)
    .map(m => ({
      operation: m.operation,
      error: m.error || "Unknown error",
      timestamp: m.timestamp,
    }))

  return {
    totalOperations,
    successRate,
    operationCounts,
    recentFailures,
  }
}

/**
 * Gets metrics for a specific operation type
 */
export function getOperationMetrics(operation: string): {
  total: number
  success: number
  failure: number
  successRate: number
} {
  const operationMetrics = metrics.filter(m => m.operation === operation)
  const total = operationMetrics.length
  const success = operationMetrics.filter(m => m.success).length
  const failure = total - success
  const successRate = total > 0 ? (success / total) * 100 : 0

  return { total, success, failure, successRate }
}

/**
 * Clears all monitoring metrics (useful for testing)
 */
export function clearMetrics(): void {
  metrics.length = 0
  console.log("🧹 All monitoring metrics cleared")
}

/**
 * Stops the cleanup interval
 */
export function stopMonitoring(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log("🛑 Database monitoring stopped")
  }
}
