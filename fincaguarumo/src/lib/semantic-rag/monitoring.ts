import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client for monitoring
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Monitoring configuration
const MONITORING_TABLE = "embedding_failures"
const ALERT_THRESHOLD = 5 // Number of failures before alert
const ALERT_WINDOW = 300000 // 5 minutes in milliseconds

export interface EmbeddingFailure {
  id?: string
  timestamp: string
  error_type: string
  error_message: string
  text_preview: string
  language?: string
  model: string
  retry_attempts: number
  processing_time_ms: number
  user_agent?: string
  ip_address?: string
  resolved: boolean
}

export interface MonitoringMetrics {
  total_failures: number
  failures_by_type: Record<string, number>
  failures_by_language: Record<string, number>
  failures_by_model: Record<string, number>
  average_processing_time: number
  failure_rate: number
  recent_failures: EmbeddingFailure[]
}

export interface AlertConfig {
  enabled: boolean
  webhook_url?: string
  email_recipients?: string[]
  slack_channel?: string
}

/**
 * Log an embedding failure for monitoring and analysis
 */
export async function logEmbeddingFailure(
  error: Error,
  text: string,
  language?: string,
  model: string = "intfloat/e5-base-instruct",
  retryAttempts: number = 0,
  processingTimeMs: number = 0,
  userAgent?: string,
  ipAddress?: string,
): Promise<void> {
  try {
    const failure: Omit<EmbeddingFailure, "id"> = {
      timestamp: new Date().toISOString(),
      error_type: error.constructor.name,
      error_message: error.message,
      text_preview: text.substring(0, 200), // Limit to 200 chars
      language,
      model,
      retry_attempts: retryAttempts,
      processing_time_ms: processingTimeMs,
      user_agent: userAgent,
      ip_address: ipAddress,
      resolved: false,
    }

    const { error: insertError } = await supabase
      .from(MONITORING_TABLE)
      .insert(failure)

    if (insertError) {
      console.error("Failed to log embedding failure:", insertError)
    } else {
      console.log("Embedding failure logged successfully")

      // Check if we should trigger an alert
      await checkAndTriggerAlert()
    }
  } catch (loggingError) {
    console.error("Error in logEmbeddingFailure:", loggingError)
  }
}

/**
 * Get monitoring metrics for embedding failures
 */
export async function getMonitoringMetrics(
  timeWindow: number = 3600000, // 1 hour default
): Promise<MonitoringMetrics> {
  try {
    const timeWindowStart = new Date(Date.now() - timeWindow).toISOString()

    // Get recent failures
    const { data: failures, error } = await supabase
      .from(MONITORING_TABLE)
      .select("*")
      .gte("timestamp", timeWindowStart)
      .order("timestamp", { ascending: false })

    if (error) {
      throw error
    }

    if (!failures || failures.length === 0) {
      return {
        total_failures: 0,
        failures_by_type: {},
        failures_by_language: {},
        failures_by_model: {},
        average_processing_time: 0,
        failure_rate: 0,
        recent_failures: [],
      }
    }

    // Calculate metrics
    const totalFailures = failures.length
    const failuresByType: Record<string, number> = {}
    const failuresByLanguage: Record<string, number> = {}
    const failuresByModel: Record<string, number> = {}
    let totalProcessingTime = 0
    let processingTimeCount = 0

    failures.forEach(failure => {
      // Count by error type
      failuresByType[failure.error_type] =
        (failuresByType[failure.error_type] || 0) + 1

      // Count by language
      const lang = failure.language || "unknown"
      failuresByLanguage[lang] = (failuresByLanguage[lang] || 0) + 1

      // Count by model
      failuresByModel[failure.model] = (failuresByModel[failure.model] || 0) + 1

      // Sum processing times
      if (failure.processing_time_ms > 0) {
        totalProcessingTime += failure.processing_time_ms
        processingTimeCount++
      }
    })

    const averageProcessingTime =
      processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0

    // Get total requests in the same window to calculate failure rate
    const { count } = await supabase
      .from("embedding_requests")
      .select("*", { count: "exact" })
      .gte("timestamp", timeWindowStart)

    const totalRequestsCount = count ?? totalFailures
    const failureRate =
      totalRequestsCount > 0 ? (totalFailures / totalRequestsCount) * 100 : 0

    return {
      total_failures: totalFailures,
      failures_by_type: failuresByType,
      failures_by_language: failuresByLanguage,
      failures_by_model: failuresByModel,
      average_processing_time: averageProcessingTime,
      failure_rate: failureRate,
      recent_failures: failures.slice(0, 10), // Last 10 failures
    }
  } catch (error) {
    console.error("Error getting monitoring metrics:", error)
    throw error
  }
}

/**
 * Check if there was a recent alert within the specified time window
 */
export async function hasRecentAlertInWindow(
  timeWindow: number,
): Promise<boolean> {
  try {
    const timeWindowStart = new Date(Date.now() - timeWindow).toISOString()

    const { data, error } = await supabase
      .from("embedding_alerts")
      .select("timestamp")
      .gte("timestamp", timeWindowStart)
      .order("timestamp", { ascending: false })
      .limit(1)

    if (error) {
      // If the table doesn't exist or there's an error, assume no recent alert
      console.error("Error checking for recent alerts:", error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error("Error checking for recent alerts:", error)
    return false
  }
}

/**
 * Check if alert conditions are met and trigger alerts
 */
async function checkAndTriggerAlert(): Promise<void> {
  try {
    const recentFailures = await getRecentFailures(ALERT_WINDOW)

    if (recentFailures.length >= ALERT_THRESHOLD) {
      // Check if there was a recent alert within the alert window
      const hasRecentAlert = await hasRecentAlertInWindow(ALERT_WINDOW)

      if (!hasRecentAlert) {
        await triggerAlert(recentFailures)
      } else {
        console.log("Alert recently sent, skipping to prevent alert storm")
      }
    }
  } catch (error) {
    console.error("Error checking alert conditions:", error)
  }
}

/**
 * Get recent failures within the specified time window
 */
async function getRecentFailures(
  timeWindow: number,
): Promise<EmbeddingFailure[]> {
  const timeWindowStart = new Date(Date.now() - timeWindow).toISOString()

  const { data, error } = await supabase
    .from(MONITORING_TABLE)
    .select("*")
    .gte("timestamp", timeWindowStart)
    .order("timestamp", { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Trigger an alert based on failure patterns
 */
async function triggerAlert(failures: EmbeddingFailure[]): Promise<void> {
  try {
    const alertData = {
      timestamp: new Date().toISOString(),
      failure_count: failures.length,
      time_window: ALERT_WINDOW,
      error_types: Array.from(new Set(failures.map(f => f.error_type))),
      languages_affected: Array.from(
        new Set(failures.map(f => f.language).filter(Boolean)),
      ),
      sample_errors: failures.slice(0, 3).map(f => ({
        error_type: f.error_type,
        error_message: f.error_message,
        timestamp: f.timestamp,
      })),
    }

    console.error("ALERT: High embedding failure rate detected", alertData)

    // Here you could integrate with various alerting systems:
    // - Send webhook to monitoring service
    // - Send email to administrators
    // - Post to Slack channel
    // - Create incident in monitoring system

    // Example webhook integration (if configured)
    const webhookUrl = process.env.EMBEDDING_ALERT_WEBHOOK_URL
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(alertData),
        })
      } catch (webhookError) {
        console.error("Failed to send alert webhook:", webhookError)
      }
    }

    // Log the alert to Supabase for audit trail
    await supabase.from("embedding_alerts").insert(alertData)
  } catch (error) {
    console.error("Error triggering alert:", error)
  }
}

/**
 * Mark failures as resolved
 */
export async function resolveFailures(failureIds: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from(MONITORING_TABLE)
      .update({ resolved: true })
      .in("id", failureIds)

    if (error) {
      throw error
    }

    console.log(`Marked ${failureIds.length} failures as resolved`)
  } catch (error) {
    console.error("Error resolving failures:", error)
    throw error
  }
}

/**
 * Get failure trends over time
 */
export async function getFailureTrends(
  timeWindow: number = 86400000, // 24 hours default
): Promise<Array<{ timestamp: string; count: number }>> {
  try {
    const timeWindowStart = new Date(Date.now() - timeWindow).toISOString()

    // Group failures by hour
    const { data, error } = await supabase
      .from(MONITORING_TABLE)
      .select("timestamp")
      .gte("timestamp", timeWindowStart)
      .order("timestamp", { ascending: true })

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Group by hour
    const hourlyCounts: Record<string, number> = {}

    data.forEach(failure => {
      const hour =
        new Date(failure.timestamp).toISOString().substring(0, 13) + ":00:00Z"
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
    })

    return Object.entries(hourlyCounts).map(([timestamp, count]) => ({
      timestamp,
      count,
    }))
  } catch (error) {
    console.error("Error getting failure trends:", error)
    throw error
  }
}

/**
 * Health check for embedding service
 */
export async function healthCheck(): Promise<{
  healthy: boolean
  metrics: MonitoringMetrics
  issues: string[]
}> {
  try {
    const metrics = await getMonitoringMetrics()
    const issues: string[] = []

    // Check failure rate
    if (metrics.failure_rate > 10) {
      // More than 10% failure rate
      issues.push(`High failure rate: ${metrics.failure_rate.toFixed(2)}%`)
    }

    // Check average processing time
    if (metrics.average_processing_time > 10000) {
      // More than 10 seconds
      issues.push(
        `High average processing time: ${metrics.average_processing_time}ms`,
      )
    }

    // Check for specific error patterns
    const timeoutErrors = metrics.failures_by_type["TimeoutError"] || 0
    if (timeoutErrors > 3) {
      issues.push(`High timeout errors: ${timeoutErrors}`)
    }

    const authErrors = metrics.failures_by_type["AuthenticationError"] || 0
    if (authErrors > 0) {
      issues.push(`Authentication errors detected: ${authErrors}`)
    }

    return {
      healthy: issues.length === 0,
      metrics,
      issues,
    }
  } catch (error) {
    console.error("Error in health check:", error)
    return {
      healthy: false,
      metrics: {
        total_failures: 0,
        failures_by_type: {},
        failures_by_language: {},
        failures_by_model: {},
        average_processing_time: 0,
        failure_rate: 0,
        recent_failures: [],
      },
      issues: ["Health check failed"],
    }
  }
}
