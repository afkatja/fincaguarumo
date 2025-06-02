"use client"
import React, { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import CheckoutForm from "./CheckoutForm"
import { useBooking } from "../../BookingProvider"
import Loading from "../loading"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
const stripePromise = loadStripe(publishableKey)

const Payment = () => {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const { bookingData } = useBooking()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerDetails: bookingData.customerDetails,
            bookingDetails: {
              ...bookingData.bookingDetails,
              type: bookingData.type,
            },
          }),
        })
        const { clientSecret: clientSecretData } = await response.json()

        setClientSecret(clientSecretData)
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

  const options = {
    clientSecret: clientSecret ?? undefined,
    appearance,
  }
  return (
    <>
      {!clientSecret ? (
        <Loading />
      ) : (
        <Elements options={options} stripe={stripePromise} key={clientSecret}>
          <CheckoutForm />
        </Elements>
      )}
    </>
  )
}

export default Payment
