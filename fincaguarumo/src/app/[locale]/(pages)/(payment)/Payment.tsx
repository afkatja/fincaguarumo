"use client"
import React, { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import CheckoutForm from "./CheckoutForm"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
const stripePromise = loadStripe(publishableKey)
let clientSecret: string | null = null

const Payment = ({
  price,
  description,
  fields,
}: {
  price: number
  description: string
  fields: Record<string, string>
}) => {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price, description, fields }),
        })
        const { clientSecret: clientSecretData } = await response.json()

        clientSecret = clientSecretData
      } catch (err) {
        console.error("Error creating intent: " + err)
      }
    }
    if (clientSecret) return

    fetchData()
  })

  const appearance = {
    theme: "stripe" as const,
    variables: {
      fontFamily: "Poppins",
      colorPrimary: "#034b35",
      colorBackground: "#3f3f46",
      colorText: "#f4f4f5",
    },
    rules: {
      ".AccordionItem--selected": {
        color: "#f4f4f5",
      },
    },
  }
  if (!clientSecret) return null
  const options = {
    clientSecret,
    appearance,
  }
  return (
    <>
      {clientSecret && (
        <Elements options={options} stripe={stripePromise} key={clientSecret}>
          <CheckoutForm bookingDetails={fields} />
        </Elements>
      )}
    </>
  )
}

export default Payment
