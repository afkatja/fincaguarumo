import { describe, it, expect } from 'vitest'
import {
  validateAmount,
  validateCurrency,
  validatePaymentMethodId,
  validateIdempotencyKey,
  validateChargeInput,
} from '../../src/core/validation'
import { defaultConfig } from '../../src/config'

describe('validation', () => {
  const config = defaultConfig

  describe('validateAmount', () => {
    it('accepts valid positive integer', () => {
      expect(validateAmount(1000, config)).toBeNull()
    })

    it('rejects non-integer', () => {
      expect(validateAmount(100.5, config)).toEqual({
        field: 'amount',
        message: 'Amount must be an integer',
      })
    })

    it('rejects zero', () => {
      expect(validateAmount(0, config)).toEqual({
        field: 'amount',
        message: 'Amount must be positive',
      })
    })

    it('rejects negative', () => {
      expect(validateAmount(-100, config)).toEqual({
        field: 'amount',
        message: 'Amount must be positive',
      })
    })

    it('rejects exceeding max', () => {
      expect(validateAmount(config.maxAmountCents + 1, config)).toEqual({
        field: 'amount',
        message: `Amount exceeds maximum of ${config.maxAmountCents} cents`,
      })
    })

    it('rejects string', () => {
      expect(validateAmount('1000', config)).toEqual({
        field: 'amount',
        message: 'Amount must be an integer',
      })
    })
  })

  describe('validateCurrency', () => {
    it('accepts allowed currencies', () => {
      config.allowedCurrencies.forEach(c => {
        expect(validateCurrency(c, config)).toBeNull()
        expect(validateCurrency(c.toUpperCase(), config)).toBeNull()
      })
    })

    it('rejects disallowed currency', () => {
      expect(validateCurrency('jpy', config)).toEqual({
        field: 'currency',
        message: `Currency must be one of: ${config.allowedCurrencies.map(c => c.toUpperCase()).join(', ')}`,
      })
    })

    it('rejects non-string', () => {
      expect(validateCurrency(123, config)).toEqual({
        field: 'currency',
        message: 'Currency must be a string',
      })
    })
  })

  describe('validatePaymentMethodId', () => {
    it('accepts valid pm_ prefix', () => {
      expect(validatePaymentMethodId('pm_card_visa')).toBeNull()
      expect(validatePaymentMethodId('pm_123abc')).toBeNull()
    })

    it('rejects missing pm_ prefix', () => {
      expect(validatePaymentMethodId('card_visa')).toEqual({
        field: 'paymentMethodId',
        message: 'Invalid payment method ID',
      })
    })

    it('rejects non-string', () => {
      expect(validatePaymentMethodId(123)).toEqual({
        field: 'paymentMethodId',
        message: 'Invalid payment method ID',
      })
    })
  })

  describe('validateIdempotencyKey', () => {
    it('accepts valid key with prefix', () => {
      expect(validateIdempotencyKey('booking-vcc:123:1000:usd', config)).toBeNull()
    })

    it('rejects wrong prefix', () => {
      expect(validateIdempotencyKey('other:123:1000:usd', config)).toEqual({
        field: 'idempotencyKey',
        message: `Idempotency key must start with "${config.idempotencyPrefix}:"`,
      })
    })

    it('rejects non-string', () => {
      expect(validateIdempotencyKey(123, config)).toEqual({
        field: 'idempotencyKey',
        message: 'Idempotency key must be a string',
      })
    })
  })

  describe('validateChargeInput', () => {
    it('returns empty for valid input', () => {
      const input = {
        amount: 1000,
        currency: 'usd',
        paymentMethodId: 'pm_card_visa',
        idempotencyKey: 'booking-vcc:123:1000:usd',
      }
      expect(validateChargeInput(input, config)).toEqual([])
    })

    it('collects multiple errors', () => {
      const input = {
        amount: -100,
        currency: 'jpy',
        paymentMethodId: 'invalid',
        idempotencyKey: 'wrong:123',
      }
      const errors = validateChargeInput(input, config)
      expect(errors.length).toBe(4)
    })

    it('rejects non-object', () => {
      expect(validateChargeInput(null, config)).toEqual([
        { field: 'root', message: 'Request body must be an object' },
      ])
      expect(validateChargeInput('string', config)).toEqual([
        { field: 'root', message: 'Request body must be an object' },
      ])
    })
  })
})