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

  // Test that auth mock works
  it('auth mock rejects on 401', async () => {
    mockAuth.verifyAdmin.mockRejectedValueOnce({ status: 401, message: 'Invalid token' })
    
    const { POST } = await import('../route')
    const request = createRequest({ amount: 1000, currency: 'usd', paymentMethodId: 'pm_card_visa', idempotencyKey: 'booking-vcc:res_123:1000:usd' })
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid token')
  })

  it('auth mock rejects on 403', async () => {
    mockAuth.verifyAdmin.mockRejectedValueOnce({ status: 403, message: 'Admin access required' })
    
    const { POST } = await import('../route')
    const request = createRequest({ amount: 1000, currency: 'usd', paymentMethodId: 'pm_card_visa', idempotencyKey: 'booking-vcc:res_123:1000:usd' })
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })
})