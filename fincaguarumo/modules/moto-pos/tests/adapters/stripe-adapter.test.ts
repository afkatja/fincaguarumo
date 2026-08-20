import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMotoPaymentIntent, createStripeAdapter } from '../../src/adapters/stripe-adapter'
import type { ChargeInput, StripeClient } from '../../src/types'
import { defaultConfig } from '../../src/config'

const config = defaultConfig

const mockPaymentIntent = (overrides: Partial<{ status: string; id: string; client_secret: string }> = {}) => ({
  id: 'pi_test_123',
  status: 'succeeded',
  client_secret: 'pi_test_123_secret',
  ...overrides,
})

const createMockStripe = (intent = mockPaymentIntent()): StripeClient => ({
  paymentIntents: {
    create: vi.fn().mockResolvedValue(intent),
  } as any,
})

describe('stripe-adapter', () => {
  let stripe: StripeClient
  let validInput: ChargeInput

  beforeEach(() => {
    stripe = createMockStripe()
    validInput = {
      amount: 1000,
      currency: 'usd',
      paymentMethodId: 'pm_card_visa',
      idempotencyKey: 'booking-vcc:123:1000:usd',
    }
  })

  describe('createStripeAdapter', () => {
    it('returns StripeClient with paymentIntents', () => {
      const adapter = createStripeAdapter('sk_test_123')
      expect(adapter).toHaveProperty('paymentIntents')
      expect(typeof adapter.paymentIntents.create).toBe('function')
    })
  })

  describe('createMotoPaymentIntent', () => {
    it('returns succeeded for successful payment', async () => {
      stripe = createMockStripe(mockPaymentIntent({ status: 'succeeded' }))
      const result = await createMotoPaymentIntent(validInput, stripe)
      expect(result).toEqual({
        paymentIntentId: 'pi_test_123',
        status: 'succeeded',
      })
    })

    it('returns requires_action with clientSecret', async () => {
      stripe = createMockStripe(mockPaymentIntent({ status: 'requires_action', client_secret: 'pi_secret' }))
      const result = await createMotoPaymentIntent(validInput, stripe)
      expect(result).toEqual({
        paymentIntentId: 'pi_test_123',
        status: 'requires_action',
        clientSecret: 'pi_secret',
      })
    })

    it('returns failed for other statuses', async () => {
      stripe = createMockStripe(mockPaymentIntent({ status: 'canceled' }))
      const result = await createMotoPaymentIntent(validInput, stripe)
      expect(result).toEqual({
        paymentIntentId: 'pi_test_123',
        status: 'failed',
      })
    })

    it('passes moto: true in payment_method_options', async () => {
      const createSpy = vi.fn().mockResolvedValue(mockPaymentIntent())
      stripe = { paymentIntents: { create: createSpy } }
      await createMotoPaymentIntent(validInput, stripe)
      expect(createSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ idempotencyKey: 'booking-vcc:123:1000:usd' })
      )
      const callArgs = createSpy.mock.calls[0][0]
      expect(callArgs.payment_method_options.card.moto).toBe(true)
    })

    it('normalizes currency to lowercase', async () => {
      const createSpy = vi.fn().mockResolvedValue(mockPaymentIntent())
      stripe = { paymentIntents: { create: createSpy } }
      const input = { ...validInput, currency: 'USD' }
      await createMotoPaymentIntent(input, stripe)
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'usd' }),
        expect.any(Object)
      )
    })
  })
})