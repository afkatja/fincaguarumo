"use client"
import { FormEventHandler, useState } from "react"
import {
  PaymentElement,
  useStripe,
  useCheckout,
  CurrencySelectorElement,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import Loading from "../loading"
import Title from "@/components/Title"
import { useBookingCore } from "../../../providers/BookingCoreProvider"

export default function CheckoutForm() {
  const stripe = useStripe()
  const checkout = useCheckout()
  const { state } = useBookingCore()

  const [message, setMessage] = useState<null | string | undefined>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isElementReady, setIsElementReady] = useState(false)
  const [isFormComplete, setIsFormComplete] = useState(false)

  // Use Stripe's amount for consistency with currency selector and backend calculations
  const displayAmount = checkout?.total?.total?.amount || 0

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
      <CurrencySelectorElement />
      <Title title={`Pay ${displayAmount} now`} titleClassName="my-4" />
      <form
        id="payment-form"
        onSubmit={handleSubmit}
        className="flex flex-col mt-4 min-h-[400px]"
      >
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
            name="pay-now-button"
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
