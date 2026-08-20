import { ChargeInput, ChargeResult, ModuleConfig, StripeClient } from '../types'
import { validateChargeInput } from './validation'

export async function createCharge(
  input: ChargeInput,
  stripe: StripeClient,
  config: ModuleConfig
): Promise<ChargeResult> {
  const errors = validateChargeInput(input, config)
  if (errors.length > 0) {
    const error = new Error('Validation failed') as Error & { validationErrors: typeof errors }
    error.validationErrors = errors
    throw error
  }

  const { amount, currency, paymentMethodId, idempotencyKey, description, metadata } = input

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          moto: true,
        },
      },
      description,
      metadata,
    },
    { idempotencyKey }
  )

  if (intent.status === 'succeeded') {
    return { paymentIntentId: intent.id, status: 'succeeded' }
  }

  if (intent.status === 'requires_action') {
    return {
      paymentIntentId: intent.id,
      status: 'requires_action',
      clientSecret: intent.client_secret ?? undefined,
    }
  }

  return { paymentIntentId: intent.id, status: 'failed' }
}