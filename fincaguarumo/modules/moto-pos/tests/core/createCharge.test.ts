import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCharge } from '../../src/core/createCharge'
import { defaultConfig } from '../../src/config'
import type { ChargeInput, StripeClient } from '../../src/types'

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

describe('createCharge', () => {
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

  it('returns succeeded for successful payment', async () => {
    stripe = createMockStripe(mockPaymentIntent({ status: 'succeeded' }))
    const result = await createCharge(validInput, stripe, config)
    expect(result).toEqual({
      paymentIntentId: 'pi_test_123',
      status: 'succeeded',
    })
  })

  it('returns requires_action with clientSecret', async () => {
    stripe = createMockStripe(mockPaymentIntent({ status: 'requires_action', client_secret: 'pi_secret' }))
    const result = await createCharge(validInput, stripe, config)
    expect(result).toEqual({
      paymentIntentId: 'pi_test_123',
      status: 'requires_action',
      clientSecret: 'pi_secret',
    })
  })

  it('returns failed for other statuses', async () => {
    stripe = createMockStripe(mockPaymentIntent({ status: 'canceled' }))
    const result = await createCharge(validInput, stripe, config)
    expect(result).toEqual({
      paymentIntentId: 'pi_test_123',
      status: 'failed',
    })
  })

  it('throws validation error for invalid amount', async () => {
    const input = { ...validInput, amount: -100 }
    await expect(createCharge(input, stripe, config)).rejects.toThrow('Validation failed')
  })

  it('throws validation error with details', async () => {
    const input = { ...validInput, amount: -100 }
    try {
      await createCharge(input, stripe, config)
    } catch (error: any) {
      expect(error.validationErrors).toBeDefined()
      expect(error.validationErrors.some((e: any) => e.field === 'amount')).toBe(true)
    }
  })

  it('passes idempotencyKey to Stripe', async () => {
    const createSpy = vi.fn().mockResolvedValue(mockPaymentIntent())
    stripe = { paymentIntents: { create: createSpy } }
    await createCharge(validInput, stripe, config)
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ idempotencyKey: 'booking-vcc:123:1000:usd' })
    )
  })

  it('passes moto: true in payment_method_options', async () => {
    const createSpy = vi.fn().mockResolvedValue(mockPaymentIntent())
    stripe = { paymentIntents: { create: createSpy } }
    await createCharge(validInput, stripe, config)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_options: { card: { moto: true } },
      }),
      expect.any(Object)
    )
  })

  it('normalizes currency to lowercase', async () => {
    const createSpy = vi.fn().mockResolvedValue(mockPaymentIntent())
    stripe = { paymentIntents: { create: createSpy } }
    const input = { ...validInput, currency: 'USD' }
    await createCharge(input, stripe, config)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'usd' }),
      expect.any(Object)
    )
  })
})