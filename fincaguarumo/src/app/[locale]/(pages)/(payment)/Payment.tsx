"use client"
import React, { useMemo, useState } from "react"
import Image from "next/image"
import { loadStripe } from "@stripe/stripe-js"
import { CheckoutProvider } from "@stripe/react-stripe-js"
import CheckoutForm from "./CheckoutForm"
import { useBooking } from "../../BookingProvider"
import Loading from "../loading"
import { serializeBookingData } from "../../../../types"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
if (!publishableKey)
  console.warn(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will not work."
  )

const stripePromise = loadStripe(publishableKey, {
  betas: ["custom_checkout_adaptive_pricing_2"],
})

const Payment = ({ ...props }: { [prop: string]: any }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const { bookingData } = useBooking()

  const fetchData = useMemo(async () => {
    const serializedData = serializeBookingData(bookingData)
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerDetails: serializedData.customerDetails,
          bookingDetails: {
            ...serializedData.bookingDetails,
            type: serializedData.bookingDetails.type,
          },
        }),
      })
      const { clientSecret: clientSecretData } = await response.json()

      setClientSecret(clientSecretData)
      return clientSecretData
    } catch (err) {
      console.error("Error creating payment session: " + err)
    }
  }, [bookingData])

  const appearance = {
    theme: "stripe" as const,
    variables: {
      fontFamily: "Poppins, sans-serif",
      colorPrimary: "#034b35",
      colorBackground: "#d1d5dc",
      colorText: "#1e2939",
      colorTextSecondary: "#1e2939",
      iconColor: "#1e2939",
    },
    rules: {},
  }

  const options = {
    appearance,
  }

  if (!stripePromise) return <Loading className="absolute" />
  if (!clientSecret) {
    return <Loading className="absolute" />
  }
  return (
    <>
      <CheckoutProvider
        options={{
          fetchClientSecret: () => fetchData,
          elementsOptions: options,
          // @ts-expect-error
          adaptivePricing: { allowed: true },
        }}
        stripe={stripePromise}
        {...props}
      >
        <CheckoutForm />
      </CheckoutProvider>
      <Image
        src="/images/stripe-badge.png"
        width={450}
        height={50}
        alt="stripe badge"
        className="w-full h-auto"
      />
    </>
  )
}

export default Payment
