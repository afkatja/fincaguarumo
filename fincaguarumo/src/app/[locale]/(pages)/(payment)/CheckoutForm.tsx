import React, { FormEventHandler, Suspense, useEffect, useState } from "react"
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "../../../../components/ui/button"
import Loading from "../loading"

export default function CheckoutForm({
  dpmCheckerLink,
}: {
  dpmCheckerLink?: string
}) {
  const stripe = useStripe()
  const elements = useElements() //stripe?.elements({ loader: "always" })

  const [message, setMessage] = useState<null | string | undefined>(null)
  const [isLoading, setIsLoading] = useState(false)
  // const [render, setRender] = useState(true)

  // useEffect(() => {
  //   const timeoutId = setTimeout(() => {
  //     setRender(true)
  //   }, 2000)

  //   // Cleanup function to clear the timeout if the component unmounts
  //   return () => clearTimeout(timeoutId)
  // }, [])

  // if (!stripe || !elements) return <Loading />

  const handleSubmit: FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: "http://localhost:3000/payment-success",
      },
    })

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message)
    } else {
      setMessage("An unexpected error occurred.")
    }

    setIsLoading(false)
  }

  const paymentElementOptions = {
    layout: "accordion" as const,
  }

  return (
    <>
      <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col">
        {message && <p className="mb-4">{message}</p>}
        <PaymentElement options={paymentElementOptions} />
        <footer className="flex flex-wrap mt-auto pt-4">
          <Button
            disabled={isLoading || !stripe || !elements}
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
