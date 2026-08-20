jest.mock('@moto-pos/core/adapters/stripe-adapter', () => ({
  createMotoPaymentIntent: jest.fn(),
  createStripeAdapter: jest.fn(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
  })),
})

jest.mock('@moto-pos/core/adapters/supabase-auth', () => ({
  createSupabaseAuthProvider: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { createSupabaseAuthProvider } from '@moto-pos/core/adapters/supabase-auth'

const mockCreateSupabaseAuthProvider = createSupabaseAuthProvider as unknown as jest.Mock

describe('Supabase Auth Provider Mock', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    process.env.STRIPE_API_KEY = 'sk_test_123'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_key'
    process.env.SUPABASE_JWT_SECRET = 'jwt_secret'
  })

  it('createSupabaseAuthProvider mock is called and returns auth', async () => {
    const mockAuth = {
      verifyAdmin: jest.fn().mockRejectedValue({ status: 401, message: 'Invalid token' }),
    }
    createSupabaseAuthProvider.mockReturnValue(mockAuth)
    
    // Import route to trigger the module-level call
    const { POST } = await import('../route')
    
    // Check that the mock was called
    expect(createSupabaseAuthProvider).toHaveBeenCalled()
    console.log('Mock calls:', createSupabaseAuthProvider.mock.calls)
    console.log('Returned value:', createSupabaseAuthProvider.mock.results)
    
    // Call the route
    const { NextRequest } = await import('next/server')
    const request = new NextRequest(new Request('http://localhost/api/pos/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000, currency: 'usd', paymentMethodId: 'pm_card_visa', idempotencyKey: 'booking-vcc:res_123:1000:usd' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    console.log('Response status:', response.status)
    console.log('Response data:', data)
  })
})