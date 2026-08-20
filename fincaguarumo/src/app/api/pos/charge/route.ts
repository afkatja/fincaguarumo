import { createNextRouteHandler } from '@moto-pos/core/http/next'
import { createStripeAdapter } from '@moto-pos/core/adapters/stripe-adapter'
import { createSupabaseAuthProvider } from '@moto-pos/core/adapters/supabase-auth'

const stripe = createStripeAdapter(process.env.STRIPE_API_KEY!)

const auth = createSupabaseAuthProvider(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  process.env.SUPABASE_JWT_SECRET
)

export const POST = createNextRouteHandler({ stripe, auth })