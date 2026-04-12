import { RetryConfig, RetryResult } from './types'

/**
 * Wraps a promise with a timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ])
}

/**
 * Adds jitter to a delay to prevent thundering herd
 */
function addJitter(delay: number, jitterPercent: number = 0.25): number {
  const jitter = delay * jitterPercent
  const randomJitter = Math.random() * jitter - jitter / 2
  return Math.max(0, delay + randomJitter)
}

/**
 * Calculates exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const clampedDelay = Math.min(exponentialDelay, maxDelay)
  return addJitter(clampedDelay)
}

/**
 * Executes a function with retries and timeout
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  operationName: string = 'unknown'
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await withTimeout(fn(), config.timeout)
      const duration = Date.now() - startTime
      
      console.log(`✅ ${operationName} succeeded on attempt ${attempt}/${config.maxAttempts} (${duration}ms)`)
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalDuration: duration
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      console.warn(`❌ ${operationName} failed on attempt ${attempt}/${config.maxAttempts}:`, lastError.message)
      
      // Don't wait for the last attempt
      if (attempt < config.maxAttempts) {
        const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay)
        console.log(`⏳ Retrying ${operationName} in ${Math.round(delay)}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  const totalDuration = Date.now() - startTime
  console.error(`💥 ${operationName} failed after ${config.maxAttempts} attempts (${totalDuration}ms total)`)
  
  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalDuration
  }
}

/**
 * Executes multiple operations in parallel with individual retry logic
 */
export async function executeWithIndividualRetries<T>(
  operations: Array<{
    name: string
    fn: () => Promise<T>
    config: RetryConfig
  }>
): Promise<Array<{ name: string; result: RetryResult<T> }>> {
  const results = await Promise.allSettled(
    operations.map(async ({ name, fn, config }) => {
      const result = await withRetries(fn, config, name)
      return { name, result }
    })
  )
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`Unexpected error in operation ${operations[index].name}:`, result.reason)
      return {
        name: operations[index].name,
        result: {
          success: false,
          error: new Error(`Unexpected error: ${result.reason}`),
          attempts: 0,
          totalDuration: 0
        }
      }
    }
  })
}
