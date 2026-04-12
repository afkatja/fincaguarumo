import { withRetries, withTimeout } from '../retry'
import { RETRY_CONFIG } from '../config'
import { recordDatabaseOperation, getDatabaseStats } from '../dbMonitor'

describe('Monitoring System', () => {
  beforeEach(() => {
    // Clear metrics before each test
    const { clearMetrics } = require('../dbMonitor')
    clearMetrics()
  })

  describe('withRetries', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      
      const result = await withRetries(mockFn, RETRY_CONFIG.email, 'test-operation')
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')
      
      const result = await withRetries(mockFn, RETRY_CONFIG.email, 'test-operation')
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'))
      
      const result = await withRetries(mockFn, RETRY_CONFIG.email, 'test-operation')
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.attempts).toBe(RETRY_CONFIG.email.maxAttempts)
      expect(mockFn).toHaveBeenCalledTimes(RETRY_CONFIG.email.maxAttempts)
    })
  })

  describe('withTimeout', () => {
    it('should succeed when promise resolves within timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      
      const result = await withTimeout(mockFn(), 1000)
      
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should fail when promise takes too long', async () => {
      const mockFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      )
      
      await expect(withTimeout(mockFn(), 1000)).rejects.toThrow('Operation timed out after 1000ms')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Database Monitoring', () => {
    it('should record successful operation', () => {
      recordDatabaseOperation({
        success: true,
        operation: 'insert',
        table: 'bookings',
        timestamp: new Date()
      })

      const stats = getDatabaseStats()
      expect(stats.totalOperations).toBe(1)
      expect(stats.successRate).toBe(100)
      expect(stats.operationCounts['insert:bookings'].success).toBe(1)
    })

    it('should record failed operation', () => {
      recordDatabaseOperation({
        success: false,
        operation: 'insert',
        table: 'bookings',
        error: 'Database connection failed',
        timestamp: new Date()
      })

      const stats = getDatabaseStats()
      expect(stats.totalOperations).toBe(1)
      expect(stats.successRate).toBe(0)
      expect(stats.operationCounts['insert:bookings'].failure).toBe(1)
      expect(stats.recentFailures).toHaveLength(1)
    })

    it('should calculate success rate correctly', () => {
      recordDatabaseOperation({
        success: true,
        operation: 'insert',
        table: 'bookings',
        timestamp: new Date()
      })
      
      recordDatabaseOperation({
        success: false,
        operation: 'insert',
        table: 'bookings',
        error: 'Failed',
        timestamp: new Date()
      })
      
      recordDatabaseOperation({
        success: true,
        operation: 'update',
        table: 'availability',
        timestamp: new Date()
      })

      const stats = getDatabaseStats()
      expect(stats.totalOperations).toBe(3)
      expect(stats.successRate).toBe(66.66666666666666) // 2/3 * 100
    })
  })
})
