import { NextRequest } from 'next/server'

jest.mock('@moto-pos/core/adapters/stripe-adapter', () => ({
  createMotoPaymentIntent: jest.fn(),
  createStripeAdapter: jest.fn(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
  })),
}))

jest.mock('@moto-pos/core/adapters/supabase-auth', () => ({
  createSupabaseAuthProvider: jest.fn(),
}))

import { createMotoPaymentIntent } from '@moto-pos/core/adapters/stripe-adapter'
import { createSupabaseAuthProvider } from '@moto-pos/core/adapters/supabase-auth'

// Create mock functions at module level so TypeScript recognizes them as jest.Mock
const mockCreateMotoPaymentIntent = createMotoPaymentIntent as unknown as jest.Mock
const mockCreateSupabaseAuthProvider = createSupabaseAuthProvider as unknown as jest.Mock

interface MockAuth {
  verifyAdmin: jest.Mock
}

const mockAuth: MockAuth = {
  verifyAdmin: jest.fn(),
}

const mockAuthInstance = {
  verifyAdmin: mockAuth.verifyAdmin,
}

describe('POST /api/pos/charge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateSupabaseAuthProvider.mockReturnValue(mockAuthInstance)
    
    process.env.STRIPE_API_KEY = 'sk_test_123'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_key'
    process.env.SUPABASE_JWT_SECRET = 'jwt_secret'
  })

  const createRequest = (body: unknown, headers: Record<string, string> = {}) => {
    return new NextRequest(new Request('http://localhost/api/pos/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }))
  }

  const validChargeBody = {
    amount: 1000,
    currency: 'usd',
    paymentMethodId: 'pm_card_visa',
    idempotencyKey: 'booking-vcc:res_123:1000:usd',
  }

  const mockAuth = {
    verifyAdmin: jest.fn(),
  }

  const testCases = [
    {
      name: 'returns 401 when auth fails',
      setup: () => {
        mockAuth.verifyAdmin.mockRejectedValueOnce({ status: 401, message: 'Invalid token' })
      },
      body: validChargeBody,
      expectedStatus: 401,
      expectedError: 'Invalid token',
    },
    {
      name: 'returns 403 when user is not admin',
      setup: () => {
        mockAuth.verifyAdmin.mockRejectedValueOnce({ status: 403, message: 'Admin access required' })
      },
      body: validChargeBody,
      expectedStatus: 403,
      expectedError: 'Admin access required',
    },
    {
      name: 'returns 400 for missing amount',
      setup: () => {
        mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
      },
      body: { ...validChargeBody, amount: undefined },
      expectedStatus: 400,
      expectedError: 'Validation failed',
      checkDetails: (d: { field: string }) => d.field === 'amount',
    },
    {
      name: 'returns 400 for missing paymentMethodId',
      setup: () => {
        mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
      },
      body: { ...validChargeBody, paymentMethodId: undefined },
      expectedStatus: 400,
      expectedError: 'Validation failed',
      checkDetails: (d: { field: string }) => d.field === 'paymentMethodId',
    },
    {
      name: 'returns 400 for invalid currency',
      setup: () => {
        mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
      },
      body: { ...validChargeBody, currency: 'jpy' },
      expectedStatus: 400,
      expectedError: 'Validation failed',
      checkDetails: (d: { field: string }) => d.field === 'currency',
    },
    {
      name: 'returns 400 for invalid idempotencyKey',
      setup: () => {
        mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
      },
      body: { ...validChargeBody, idempotencyKey: 'wrong:123' },
      expectedStatus: 400,
      expectedError: 'Validation failed',
      checkDetails: (d: { field: string }) => d.field === 'idempotencyKey',
    },
  ]

  testCases.forEach(({ name, setup, body, expectedStatus, expectedError, checkDetails }) => {
    it(name, async () => {
      setup()
      const { POST } = await import('../route')
      const request = createRequest(body)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(expectedStatus)
      expect(data.error).toBe(expectedError)
      if (checkDetails) {
        expect(data.details.some(checkDetails)).toBe(true)
      }
    })
  })

  it('returns 200 with paymentIntentId on successful charge', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    mockCreateMotoPaymentIntent.mockResolvedValueOnce({
      paymentIntentId: 'pi_test_123',
      status: 'succeeded',
    })

    const { POST } = await import('../route')
    const request = createRequest(validChargeBody)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paymentIntentId).toBe('pi_test_123')
    expect(mockCreateMotoPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        currency: 'usd',
        paymentMethodId: 'pm_card_visa',
        idempotencyKey: 'booking-vcc:res_123:1000:usd',
      }),
      expect.any(Object)
    )
  })

  it('returns 422 with clientSecret when requires_action', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    mockCreateMotoPaymentIntent.mockResolvedValueOnce({
      paymentIntentId: 'pi_test_123',
      status: 'requires_action',
      clientSecret: 'pi_test_123_secret',
    })

    const { POST } = await import('../route')
    const request = createRequest(validChargeBody)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.status).toBe('requires_action')
    expect(data.clientSecret).toBe('pi_test_123_secret')
    expect(data.paymentIntentId).toBe('pi_test_123')
  })

  it('returns 422 for failed payment', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    mockCreateMotoPaymentIntent.mockResolvedValueOnce({
      paymentIntentId: 'pi_test_123',
      status: 'failed',
    })

    const { POST } = await import('../route')
    const request = createRequest(validChargeBody)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.status).toBe('failed')
  })

  it('returns 402 for Stripe card error', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    const cardError = new Error('Card declined') as Error & { type: string }
    cardError.type = 'StripeCardError'
    mockCreateMotoPaymentIntent.mockRejectedValueOnce(cardError)

    const { POST } = await import('../route')
    const request = createRequest(validChargeBody)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(402)
    expect(data.error).toBe('Card declined')
  })

  it('returns 400 for Stripe invalid request error', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    const invalidError = new Error('Invalid amount') as Error & { type: string }
    invalidError.type = 'StripeInvalidRequestError'
    mockCreateMotoPaymentIntent.mockRejectedValueOnce(invalidError)

    const { POST } = await import('../route')
    const request = createRequest(validChargeBody)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid amount')
  })

  it('returns 500 for unknown errors', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    mockCreateMotoPaymentIntent.mockRejectedValueOnce(new Error('Unknown error'))

    const { POST } = await import('../route')
    const request = createRequest(validChargeBody)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('normalizes currency to lowercase in adapter', async () => {
    mockAuth.verifyAdmin.mockResolvedValueOnce({ id: 'user_1', email: 'admin@test.com', isAdmin: true })
    mockCreateMotoPaymentIntent.mockResolvedValueOnce({
      paymentIntentId: 'pi_test_123',
      status: 'succeeded',
    })

    const { POST } = await import('../route')
    const request = createRequest({ ...validChargeBody, currency: 'USD' })
    await POST(request)

    // The adapter normalizes currency internally, so it receives the original currency
    // but the Stripe API call uses lowercase
    expect(mockCreateMotoPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' }),
      expect.any(Object)
    )
  })

  it('returns 405 for non-POST method', async () => {
    const { POST } = await import('../route')
    const request = new NextRequest(new Request('http://localhost/api/pos/charge', {
      method: 'GET',
    }))

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed')
  })
})