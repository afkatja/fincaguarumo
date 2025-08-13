import React, { FormEventHandler, useState } from "react"
import { PaymentElement, useStripe, useCheckout } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import Loading from "../loading"

export default function CheckoutForm() {
  const stripe = useStripe()
  const checkout = useCheckout()

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

  return (
    <>
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
