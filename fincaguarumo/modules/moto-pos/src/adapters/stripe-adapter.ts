import Stripe from 'stripe'
import type { StripeClient, ChargeInput, ChargeResult } from '../types'

export function createStripeAdapter(apiKey: string): StripeClient {
  const stripe = new Stripe(apiKey, {
    typescript: true,
  })
  return {
    paymentIntents: stripe.paymentIntents,
  }
}

export async function createMotoPaymentIntent(
  input: ChargeInput,
  stripe: StripeClient
): Promise<ChargeResult> {
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