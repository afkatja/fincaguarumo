import { RetryConfig } from './types'

export const RETRY_CONFIG: Record<string, RetryConfig> = {
  email: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    timeout: 5000
  },
  sanity: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 2000,
    timeout: 3000
  },
  supabase: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 2000,
    timeout: 3000
  },
  availability: {
    maxAttempts: 2,
    baseDelay: 300,
    maxDelay: 1000,
    timeout: 2000
  },
  booking: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 2000,
    timeout: 3000
  }
}

export const MONITORING_CONFIG = {
  // Store metrics for 1 hour in memory
  metricsRetentionMs: 60 * 60 * 1000,
  // Cleanup interval
  cleanupIntervalMs: 5 * 60 * 1000,
  // Max metrics to store
  maxMetricsCount: 1000
}
