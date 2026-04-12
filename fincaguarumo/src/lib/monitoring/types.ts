export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  timeout: number
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalDuration: number
}

export interface MonitoringMetrics {
  operation: string
  success: boolean
  error?: string
  timestamp: Date
  duration?: number
  attempts?: number
}

export interface FailedEmailRecord {
  id?: string
  email_type: string
  recipient_email: string
  subject?: string
  content: any
  error_message: string
  retry_count: number
  max_retries: number
  next_retry_at?: Date
  created_at: Date
  updated_at: Date
}

export interface DatabaseOperationResult {
  success: boolean
  operation: string
  table: string
  error?: string
  timestamp: Date
}

export type OperationType = 'email' | 'sanity' | 'supabase' | 'availability' | 'booking'
