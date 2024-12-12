"use client"
import React, { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import CheckoutForm from "./CheckoutForm"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
const stripePromise = loadStripe(publishableKey)

const Payment = ({
  price,
  description,
  fields,
}: {
  price: number
  description: string
  fields: Record<string, any>
}) => {
  const [clientSecret, setClientSecret] = useState("")
  // const [dpmCheckerLink, setDpmCheckerLink] = useState("")

  useEffect(() => {
    if (clientSecret) return
    console.log(fields)

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price, description, fields }),
    })
      .then(res => res.json())
      .then(data => {
        setClientSecret(data.clientSecret)
        // [DEV] For demo purposes only
        // setDpmCheckerLink(data.dpmCheckerLink)
      })
      .catch(err => console.error("Error creating intent: " + err))
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
  const options = {
    clientSecret,
    appearance,
  }

  return (
    <>
      {clientSecret && (
        <Elements options={options} stripe={stripePromise} key={clientSecret}>
          <CheckoutForm />
        </Elements>
      )}
    </>
  )
}

export default Payment
