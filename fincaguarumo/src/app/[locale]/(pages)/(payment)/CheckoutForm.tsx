import React, { FormEventHandler, useState } from "react"
import {
  PaymentElement,
  useStripe,
  useElements,
  useCheckout,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import Loading from "../loading"
import { useBooking } from "../../BookingProvider"

export default function CheckoutForm({
  dpmCheckerLink,
}: {
  dpmCheckerLink?: string
}) {
  const stripe = useStripe()
  // const elements = useElements() //stripe?.elements({ loader: "always" })
  const checkout = useCheckout()
  const { bookingData } = useBooking()

  const [message, setMessage] = useState<null | string | undefined>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isElementReady, setIsElementReady] = useState(false)
  const [isFormComplete, setIsFormComplete] = useState(false)

  const handleSubmit: FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()

    if (!stripe) {
      return
    }

    setIsLoading(true)
    // const result = await checkout.updateEmail(bookingData.customerDetails.email)
    // if (result.type === "error") setMessage(result.error.message)

    const confirmResult = await checkout.confirm()
    if (confirmResult.type === "error") {
      setMessage(confirmResult.error.message)
    }

    setIsLoading(false)
  }

  const paymentElementOptions = {
    // layout: "accordion" as const,
  }

  return (
    <>
      <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col">
        {message && <p className="mb-4">{message}</p>}
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
          >
            {isLoading ? <Loading /> : "Pay now"}
          </Button>
        </footer>
      </form>
      {/* [DEV]: For demo purposes only, display dynamic payment methods annotation and integration checker */}
      {/* <div id="dpm-annotation">
        <p>
          Payment methods are dynamically displayed based on customer location,
          order amount, and currency.&nbsp;
          <a
            href={dpmCheckerLink}
            target="_blank"
            rel="noopener noreferrer"
            id="dpm-integration-checker"
          >
            Preview payment methods by transaction
          </a>
        </p>
      </div> */}
    </>
  )
}
