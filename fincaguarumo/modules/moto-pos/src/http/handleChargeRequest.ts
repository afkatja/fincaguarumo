import type {
  HttpRequestLike,
  HttpResponseLike,
  AuthProvider,
  ModuleConfig,
  StripeClient,
  ChargeInput,
  ValidationError,
} from '../types'
import { mergeConfig } from '../config'
import { createMotoPaymentIntent } from '../adapters/stripe-adapter'
import { validateChargeInput } from '../core/validation'

export interface HandleChargeOptions {
  stripe: StripeClient
  auth: AuthProvider
  config?: Partial<ModuleConfig>
}

export async function handleChargeRequest(
  req: HttpRequestLike,
  options: HandleChargeOptions
): Promise<HttpResponseLike> {
  const config = mergeConfig(options.config)

  if (req.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  // Authenticate admin
  try {
    await options.auth.verifyAdmin(req)
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    return {
      status: err.status || 500,
      body: { error: err.message || 'Authentication failed' },
    }
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { status: 400, body: { error: 'Invalid JSON body' } }
  }

  // Validate input
  const errors = validateChargeInput(body, config)
  if (errors.length > 0) {
    return {
      status: 400,
      body: { error: 'Validation failed', details: errors },
    }
  }

  const input = body as ChargeInput

  try {
    const result = await createMotoPaymentIntent(input, options.stripe)

    if (result.status === 'succeeded') {
      return { status: 200, body: { paymentIntentId: result.paymentIntentId } }
    }

    if (result.status === 'requires_action') {
      return {
        status: 422,
        body: {
          error: 'Payment requires additional authentication (3D Secure)',
          status: result.status,
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
        },
      }
    }

    return {
      status: 422,
      body: {
        error: `Stripe payment status: ${result.status}`,
        status: result.status,
        paymentIntentId: result.paymentIntentId,
      },
    }
  } catch (error: unknown) {
    const err = error as { validationErrors?: ValidationError[]; type?: string; message?: string }
    if (err.validationErrors) {
      return {
        status: 400,
        body: { error: 'Validation failed', details: err.validationErrors },
      }
    }

    if (err.type === 'StripeCardError') {
      return { status: 402, body: { error: err.message || 'Card error' } }
    }

    if (err.type === 'StripeInvalidRequestError') {
      return { status: 400, body: { error: err.message || 'Invalid request' } }
    }

    console.error('Charge request error:', error)
    return { status: 500, body: { error: 'Internal server error' } }
  }
}