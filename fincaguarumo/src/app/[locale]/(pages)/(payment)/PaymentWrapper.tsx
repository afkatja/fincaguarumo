import React from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""

if (!publishableKey) {
  console.warn(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will not work."
  )
}

const stripePromise = publishableKey && loadStripe(publishableKey)

const PaymentWrapper = ({ children }: { children: React.ReactNode }) => {
  if (!stripePromise) return children

  return <Elements stripe={stripePromise}>{children}</Elements>
}

export default PaymentWrapper
