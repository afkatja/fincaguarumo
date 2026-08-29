"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StringsProvider } from "@moto-pos/core/strings"
import { MotoChargePanel } from "@moto-pos/core/react"
import "@moto-pos/core/tokens.css"

const queryClient = new QueryClient()

const ChargeWidget = ({ defaultAmount = 100, defaultCurrency = "usd" }) => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return "Stripe publishable key is not set. Please set the NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable."
  }
  return (
    <QueryClientProvider client={queryClient}>
      <StringsProvider>
        <div className="moto-pos">
          <MotoChargePanel
            defaultAmount={defaultAmount * 100} // dollars → cents
            defaultCurrency={defaultCurrency}
            publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
          />
        </div>
      </StringsProvider>
    </QueryClientProvider>
  )
}
export default ChargeWidget
