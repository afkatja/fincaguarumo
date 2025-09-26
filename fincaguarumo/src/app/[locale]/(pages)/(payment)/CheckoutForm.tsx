"use client"
import React, { FormEventHandler, useState } from "react"
import {
  PaymentElement,
  useStripe,
  useCheckout,
  CurrencySelectorElement,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import Loading from "../loading"
import Title from "@/components/Title"
// import { useBooking } from "../../BookingProvider"

export default function CheckoutForm() {
  const stripe = useStripe()
  const checkout = useCheckout()

  // const { bookingData } = useBooking()

  const [message, setMessage] = useState<null | string | undefined>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isElementReady, setIsElementReady] = useState(false)
  const [isFormComplete, setIsFormComplete] = useState(false)

  const handleSubmit: FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()

    if (!stripe) {
      return
    }
    if (!checkout) {
      setMessage("Payment service not ready. Please try again.")
      return
    }

    setMessage(null)
    setIsLoading(true)
    // const result = await checkout.updateEmail(bookingData.customerDetails.email)
    // if (result.type === "error") setMessage(result.error.message)

    try {
      const confirmResult = await checkout.confirm()
      if (confirmResult.type === "error") {
        setMessage(confirmResult.error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const paymentElementOptions = {
    // layout: "accordion" as const,
  }

  // const currency = bookingData.bookingDetails.currency?.toUpperCase() ?? "USD"
  // const amount = Number(bookingData.bookingDetails.totalPrice || 0).toFixed(2)
  // console.log(checkout.currencyOptions)

  return (
    <>
      <CurrencySelectorElement />
      <Title title={`Pay ${checkout.total.total.amount} now`} />
      <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col">
        {message && (
          <p className="mb-4" aria-live="polite" role="status">
            {message}
          </p>
        )}
        <PaymentElement
          options={paymentElementOptions}
          onReady={() => {
            if (!isElementReady) {
              setIsElementReady(true)
            }
          }}
          onChange={e => setIsFormComplete(e.complete)}
        />
        <footer className="flex flex-wrap mt-auto pt-4">
          <Button
            disabled={
              isLoading || !stripe || !isElementReady || !isFormComplete
            }
            className="ml-auto"
            type="submit"
          >
            {isLoading ? <Loading /> : "Pay now"}
          </Button>
        </footer>
      </form>
    </>
  )
}
