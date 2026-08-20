import type Stripe from 'stripe'

export interface ChargeInput {
  amount: number
  currency: string
  paymentMethodId: string
  idempotencyKey: string
  description?: string
  metadata?: Record<string, string>
}

export interface ChargeResult {
  paymentIntentId: string
  status: 'succeeded' | 'requires_action' | 'failed'
  clientSecret?: string
}

export interface AuthUser {
  id: string
  email?: string
  isAdmin: boolean
}

export interface AuthProvider {
  verifyUser(req: Request): Promise<AuthUser>
  verifyAdmin(req: Request): Promise<AuthUser>
}

export interface ModuleConfig {
  maxAmountCents: number
  allowedCurrencies: string[]
  idempotencyPrefix: string
}

export interface HttpRequestLike {
  method: string
  headers: Headers
  json(): Promise<unknown>
}

export interface HttpResponseLike {
  status: number
  body: unknown
}

export type StripeClient = Pick<
  Stripe,
  'paymentIntents'
>

export interface ValidationError {
  field: string
  message: string
}