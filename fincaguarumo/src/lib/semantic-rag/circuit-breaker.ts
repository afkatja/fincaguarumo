export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  expectedRecoveryTime: number
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  lastFailureTime: number
  nextAttemptTime: number
  successCount: number
  totalRequests: number
  totalFailures: number
  averageResponseTime: number
  lastStateChange: string
}

export interface CircuitBreakerMetrics {
  currentState: string
  uptime: number
  totalRequests: number
  successRate: number
  failureRate: number
  averageResponseTime: number
  stateChanges: number
  timeInCurrentState: number
}

/**
 * Circuit Breaker implementation for external API calls
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failureCount = 0
  private lastFailureTime = 0
  private nextAttemptTime = 0
  private successCount = 0
  private totalRequests = 0
  private totalFailures = 0
  private responseTimes: number[] = []
  private stateChangeCount = 0
  private lastStateChangeTime = Date.now()
  private stateChangeReason = ''

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedRecoveryTime: 30000, // 30 seconds
    }
  ) {
    console.log(`Circuit breaker initialized for service: ${serviceName}`)
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    this.totalRequests++

    try {
      // Check if circuit is open and we should fail fast
      if (this.state === 'OPEN') {
        if (Date.now() < this.nextAttemptTime) {
          throw new Error(`Circuit breaker is OPEN for ${this.serviceName}. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`)
        }
        this.transitionToHalfOpen('Recovery timeout reached, attempting recovery')
      }

      // Execute the operation
      const result = await operation()
      
      // Record success
      this.recordSuccess(Date.now() - startTime)
      
      return result

    } catch (error) {
      // Record failure
      this.recordFailure(Date.now() - startTime, error as Error)
      
      // Check if we should transition to OPEN state
      if (this.state === 'HALF_OPEN' || this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen('Failure threshold reached')
      }
      
      throw error
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(responseTime: number): void {
    this.successCount++
    this.responseTimes.push(responseTime)
    
    // Keep only last 100 response times for average calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift()
    }

    // If in HALF_OPEN state, consider transitioning back to CLOSED
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= 2) { // Need 2 consecutive successes to close
        this.transitionToClosed('Recovery successful')
      }
    }

    // Reset failure count on success in CLOSED state
    if (this.state === 'CLOSED') {
      this.failureCount = 0
    }

    console.log(`Circuit breaker ${this.serviceName}: Operation succeeded (${this.responseTimeSummary()})`)
  }

  /**
   * Record a failed operation
   */
  private recordFailure(responseTime: number, error: Error): void {
    this.failureCount++
    this.totalFailures++
    this.lastFailureTime = Date.now()
    
    console.error(`Circuit breaker ${this.serviceName}: Operation failed (${error.message})`)
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(reason: string): void {
    if (this.state !== 'OPEN') {
      this.state = 'OPEN'
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      this.successCount = 0
      this.recordStateChange('OPEN', reason)
      
      console.error(`Circuit breaker ${this.serviceName}: Transitioned to OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`)
    }
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(reason: string): void {
    if (this.state !== 'HALF_OPEN') {
      this.state = 'HALF_OPEN'
      this.successCount = 0
      this.recordStateChange('HALF_OPEN', reason)
      
      console.log(`Circuit breaker ${this.serviceName}: Transitioned to HALF_OPEN`)
    }
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(reason: string): void {
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED'
      this.failureCount = 0
      this.successCount = 0
      this.recordStateChange('CLOSED', reason)
      
      console.log(`Circuit breaker ${this.serviceName}: Transitioned to CLOSED`)
    }
  }

  /**
   * Record a state change
   */
  private recordStateChange(newState: string, reason: string): void {
    this.stateChangeCount++
    this.lastStateChangeTime = Date.now()
    this.stateChangeReason = reason
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      averageResponseTime: this.getAverageResponseTime(),
      lastStateChange: this.stateChangeReason,
    }
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const successRate = this.totalRequests > 0 ? ((this.totalRequests - this.totalFailures) / this.totalRequests) * 100 : 0
    const failureRate = this.totalRequests > 0 ? (this.totalFailures / this.totalRequests) * 100 : 0
    
    return {
      currentState: this.state,
      uptime: Date.now() - this.lastStateChangeTime,
      totalRequests: this.totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      averageResponseTime: this.getAverageResponseTime(),
      stateChanges: this.stateChangeCount,
      timeInCurrentState: Date.now() - this.lastStateChangeTime,
    }
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0
    
    const sum = this.responseTimes.reduce((a, b) => a + b, 0)
    return Math.round((sum / this.responseTimes.length) * 100) / 100
  }

  /**
   * Get response time summary for logging
   */
  private responseTimeSummary(): string {
    const avg = this.getAverageResponseTime()
    return `${avg}ms avg`
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = 0
    this.nextAttemptTime = 0
    this.successCount = 0
    this.totalRequests = 0
    this.totalFailures = 0
    this.responseTimes = []
    this.stateChangeCount = 0
    this.lastStateChangeTime = Date.now()
    this.stateChangeReason = 'Manual reset'
    
    console.log(`Circuit breaker ${this.serviceName}: Reset to initial state`)
  }

  /**
   * Force the circuit breaker into a specific state (for testing/administration)
   */
  forceState(state: 'CLOSED' | 'OPEN' | 'HALF_OPEN', reason: string = 'Manual override'): void {
    switch (state) {
      case 'CLOSED':
        this.transitionToClosed(reason)
        break
      case 'OPEN':
        this.transitionToOpen(reason)
        break
      case 'HALF_OPEN':
        this.transitionToHalfOpen(reason)
        break
    }
  }

  /**
   * Check if the circuit breaker is currently allowing requests
   */
  isRequestAllowed(): boolean {
    return this.state === 'CLOSED' || (this.state === 'HALF_OPEN' && Date.now() >= this.nextAttemptTime)
  }

  /**
   * Get time until next attempt (if circuit is open)
   */
  getTimeUntilNextAttempt(): number {
    if (this.state !== 'OPEN') return 0
    return Math.max(0, this.nextAttemptTime - Date.now())
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>()

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config))
    }
    return this.circuitBreakers.get(serviceName)!
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {}
    
    for (const [serviceName, breaker] of this.circuitBreakers) {
      metrics[serviceName] = breaker.getMetrics()
    }
    
    return metrics
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): {
    healthy: string[]
    degraded: string[]
    unhealthy: string[]
  } {
    const healthy: string[] = []
    const degraded: string[] = []
    const unhealthy: string[] = []

    for (const [serviceName, breaker] of this.circuitBreakers) {
      const state = breaker.getState()
      
      if (state.state === 'CLOSED') {
        healthy.push(serviceName)
      } else if (state.state === 'HALF_OPEN') {
        degraded.push(serviceName)
      } else {
        unhealthy.push(serviceName)
      }
    }

    return { healthy, degraded, unhealthy }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset()
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalServices: number
    healthyServices: number
    degradedServices: number
    unhealthyServices: number
    totalRequests: number
    overallSuccessRate: number
  } {
    const healthStatus = this.getHealthStatus()
    const allMetrics = this.getAllMetrics()
    
    const totalRequests = Object.values(allMetrics).reduce((sum, metrics) => sum + metrics.totalRequests, 0)
    const totalSuccesses = Object.values(allMetrics).reduce((sum, metrics) => sum + (metrics.totalRequests * metrics.successRate / 100), 0)
    const overallSuccessRate = totalRequests > 0 ? (totalSuccesses / totalRequests) * 100 : 0

    return {
      totalServices: this.circuitBreakers.size,
      healthyServices: healthStatus.healthy.length,
      degradedServices: healthStatus.degraded.length,
      unhealthyServices: healthStatus.unhealthy.length,
      totalRequests,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
    }
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager()

/**
 * Decorator to automatically apply circuit breaker to a function
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  serviceName: string,
  config?: CircuitBreakerConfig
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    const breaker = circuitBreakerManager.getCircuitBreaker(serviceName, config)

    descriptor.value = async function (...args: any[]) {
      return breaker.execute(() => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

/**
 * Higher-order function to wrap async functions with circuit breaker
 */
export function createCircuitBreakerWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  serviceName: string,
  config?: CircuitBreakerConfig
): T {
  const breaker = circuitBreakerManager.getCircuitBreaker(serviceName, config)
  
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return breaker.execute(() => fn(...args))
  }) as T
}
