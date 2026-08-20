import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleChargeRequest } from '../../src/http/handleChargeRequest'
import type { HttpRequestLike, StripeClient, AuthProvider } from '../../src/types'
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

const createMockAuth = (overrides: Partial<{ isAdmin: boolean; error: Error }> = {}): AuthProvider => ({
  verifyUser: vi.fn().mockResolvedValue({ id: 'user_1', email: 'test@example.com', isAdmin: true }),
  verifyAdmin: vi.fn().mockResolvedValue({ id: 'user_1', email: 'test@example.com', isAdmin: true }),
  ...overrides,
})

const createMockRequest = (overrides: Partial<HttpRequestLike> = {}): HttpRequestLike => ({
  method: 'POST',
  headers: new Headers({ authorization: 'Bearer valid_token' }),
  json: vi.fn().mockResolvedValue({
    amount: 1000,
    currency: 'usd',
    paymentMethodId: 'pm_card_visa',
    idempotencyKey: 'booking-vcc:123:1000:usd',
  }),
  ...overrides,
})

describe('handleChargeRequest', () => {
  let stripe: StripeClient
  let auth: AuthProvider
  let req: HttpRequestLike

  beforeEach(() => {
    stripe = createMockStripe()
    auth = createMockAuth()
    req = createMockRequest()
  })

  it('returns 200 for successful charge', async () => {
    stripe = createMockStripe(mockPaymentIntent({ status: 'succeeded' }))
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ paymentIntentId: 'pi_test_123' })
  })

  it('returns 422 with clientSecret for requires_action', async () => {
    stripe = createMockStripe(mockPaymentIntent({ status: 'requires_action', client_secret: 'pi_secret' }))
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(422)
    expect(result.body).toMatchObject({
      status: 'requires_action',
      clientSecret: 'pi_secret',
      paymentIntentId: 'pi_test_123',
    })
  })

  it('returns 422 for failed payment', async () => {
    stripe = createMockStripe(mockPaymentIntent({ status: 'failed' }))
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(422)
    expect(result.body.status).toBe('failed')
  })

  it('returns 405 for non-POST method', async () => {
    req = createMockRequest({ method: 'GET' })
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(405)
    expect(result.body.error).toBe('Method not allowed')
  })

  it('returns 401 for auth failure', async () => {
    auth = createMockAuth({ error: { status: 401, message: 'Invalid token' } })
    auth.verifyAdmin = vi.fn().mockRejectedValue({ status: 401, message: 'Invalid token' })
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(401)
    expect(result.body.error).toBe('Invalid token')
  })

  it('returns 403 for non-admin user', async () => {
    auth = createMockAuth({ error: { status: 403, message: 'Admin access required' } })
    auth.verifyAdmin = vi.fn().mockRejectedValue({ status: 403, message: 'Admin access required' })
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(403)
    expect(result.body.error).toBe('Admin access required')
  })

  it('returns 400 for invalid JSON', async () => {
    req = createMockRequest({ json: vi.fn().mockRejectedValue(new Error('Bad JSON')) })
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(400)
    expect(result.body.error).toBe('Invalid JSON body')
  })

  it('returns 400 for validation errors', async () => {
    req = createMockRequest({
      json: vi.fn().mockResolvedValue({
        amount: -100,
        currency: 'jpy',
        paymentMethodId: 'invalid',
        idempotencyKey: 'wrong:123',
      }),
    })
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(400)
    expect(result.body.error).toBe('Validation failed')
    expect(result.body.details.length).toBe(4)
  })

  it('returns 402 for Stripe card error', async () => {
    const cardError = new Error('Card declined') as Error & { type: string }
    cardError.type = 'StripeCardError'
    stripe = createMockStripe()
    stripe.paymentIntents.create = vi.fn().mockRejectedValue(cardError)
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(402)
    expect(result.body.error).toBe('Card declined')
  })

  it('returns 400 for Stripe invalid request error', async () => {
    const invalidError = new Error('Invalid amount') as Error & { type: string }
    invalidError.type = 'StripeInvalidRequestError'
    stripe = createMockStripe()
    stripe.paymentIntents.create = vi.fn().mockRejectedValue(invalidError)
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(400)
    expect(result.body.error).toBe('Invalid amount')
  })

  it('returns 500 for unknown errors', async () => {
    stripe = createMockStripe()
    stripe.paymentIntents.create = vi.fn().mockRejectedValue(new Error('Unknown'))
    const result = await handleChargeRequest(req, { stripe, auth, config })
    expect(result.status).toBe(500)
    expect(result.body.error).toBe('Internal server error')
  })

  it('passes config overrides', async () => {
    const customConfig = { ...config, maxAmountCents: 500 }
    req = createMockRequest({
      json: vi.fn().mockResolvedValue({
        amount: 600,
        currency: 'usd',
        paymentMethodId: 'pm_card_visa',
        idempotencyKey: 'booking-vcc:123:600:usd',
      }),
    })
    const result = await handleChargeRequest(req, { stripe, auth, config: customConfig })
    expect(result.status).toBe(400)
    expect(result.body.details.some((d: any) => d.field === 'amount')).toBe(true)
  })
})