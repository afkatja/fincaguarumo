"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StringsProvider } from "@moto-pos/core/strings"
import { MotoChargePanel } from "@moto-pos/core/react"
import "@moto-pos/core/tokens.css"
import { useSupabaseAuth } from "../hooks/useSupabaseAuth"
import { useEffect, useState } from "react"
import Loading from "../app/[locale]/loading"

const queryClient = new QueryClient()

const ChargeWidget = ({ defaultAmount = 100, defaultCurrency = "usd" }) => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return "Stripe publishable key is not set. Please set the NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable."
  }
  const { getAccessToken } = useSupabaseAuth()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchToken = async () => {
      const authToken = await getAccessToken()
      if (!authToken) {
        console.error("Failed to get access token")
        setIsLoading(false)
        return
      }
      setToken(authToken)
      setIsLoading(false)
    }
    fetchToken()
  }, [getAccessToken])

  if (isLoading) {
    return <Loading />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StringsProvider>
        <div className="moto-pos">
          <MotoChargePanel
            defaultAmount={defaultAmount}
            defaultCurrency={defaultCurrency}
            publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
            endpoint="/api/pos/charge"
            getAuthToken={() => token}
          />
        </div>
      </StringsProvider>
    </QueryClientProvider>
  )
}
export default ChargeWidget
