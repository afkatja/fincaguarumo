"use client"
import React, { useMemo, useState } from "react"
import Image from "next/image"
import { loadStripe } from "@stripe/stripe-js"
import {
  CheckoutProvider,
  CurrencySelectorElement,
} from "@stripe/react-stripe-js"
import CheckoutForm from "./CheckoutForm"
import { useBooking } from "../../BookingProvider"
import Loading from "../loading"
import Title from "@/components/Title"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""

const stripePromise =
  publishableKey &&
  loadStripe(publishableKey, {
    betas: ["custom_checkout_adaptive_pricing_2"],
  })

const Payment = () => {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const { bookingData } = useBooking()
  const fetchData = useMemo(async () => {
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerDetails: bookingData.customerDetails,
          bookingDetails: {
            ...bookingData.bookingDetails,
            type: bookingData.bookingDetails.type,
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

  const currency = bookingData.bookingDetails.currency?.toUpperCase() ?? "USD"
  const amount = Number(bookingData.bookingDetails.totalPrice || 0).toFixed(2)

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
        }}
        stripe={stripePromise}
      >
        <CurrencySelectorElement />
        <Title title={`Pay ${currency} ${amount}  now`} />
        <CheckoutForm />
      </CheckoutProvider>
      <Image
        src="/images/stripe-badge.png"
        width={450}
        height={50}
        alt="stripe badge"
        className="w-full"
      />
    </>
  )
}

export default Payment
