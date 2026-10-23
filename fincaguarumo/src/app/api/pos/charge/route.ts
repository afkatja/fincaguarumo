import { createNextRouteHandler } from "@moto-pos/core/http/next"
import { createStripeAdapter } from "@moto-pos/core/adapters/stripe-adapter"
import { createSupabaseAuthProvider } from "@moto-pos/core/adapters/supabase-auth"

if (!process.env.STRIPE_API_KEY) {
  throw new Error("STRIPE_API_KEY environment variable is not set.")
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is not set.")
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set.")
}
if (!process.env.SUPABASE_JWT_SECRET) {
  throw new Error("SUPABASE_JWT_SECRET environment variable is not set.")
}

const stripe = createStripeAdapter(process.env.STRIPE_API_KEY)

const auth = createSupabaseAuthProvider({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.SUPABASE_JWT_SECRET,
})

export const POST = createNextRouteHandler({ stripe, auth })
