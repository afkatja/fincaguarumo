"use client"
import React, { useState } from "react"
import { useStripe } from "@stripe/react-stripe-js"

import {
  Success as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "./icons"
import PaymentWrapper from "../app/[locale]/(pages)/PaymentWrapper"

const STATUS_CONTENT_MAP: Record<
  string,
  { text: string; iconColor: string; icon: React.ReactNode }
> = {
  succeeded: {
    text: "Payment succeeded",
    iconColor: "#30B130",
    icon: SuccessIcon,
  },
  processing: {
    text: "Your payment is processing.",
    iconColor: "#6D6E78",
    icon: InfoIcon,
  },
  requires_payment_method: {
    text: "Your payment was not successful, please try again.",
    iconColor: "#DF1B41",
    icon: ErrorIcon,
  },
  default: {
    text: "Something went wrong, please try again.",
    iconColor: "#DF1B41",
    icon: ErrorIcon,
  },
}

export default function CompletePage() {
  const stripe = useStripe()

  const [status, setStatus] = useState("default")
  const [intentId, setIntentId] = useState<string | null>(null)

  React.useEffect(() => {
    if (!stripe) {
      return
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    )

    if (!clientSecret) {
      return
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) {
        return
      }

      setStatus(paymentIntent.status)
      setIntentId(paymentIntent.id)
    })
  }, [stripe])

  return (
    <PaymentWrapper>
      <div
        id="status-icon"
        style={{ backgroundColor: STATUS_CONTENT_MAP[status].iconColor }}
      >
        {STATUS_CONTENT_MAP[status].icon}
      </div>
      <h2 id="status-text">{STATUS_CONTENT_MAP[status].text}</h2>
      {intentId && (
        <div id="details-table">
          <table>
            <tbody>
              <tr>
                <td className="TableLabel">id</td>
                <td id="intent-id" className="TableContent">
                  {intentId}
                </td>
              </tr>
              <tr>
                <td className="TableLabel">status</td>
                <td id="intent-status" className="TableContent">
                  {status}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {intentId && (
        <a
          href={`https://dashboard.stripe.com/payments/${intentId}`}
          id="view-details"
          target="_blank"
        >
          View details
        </a>
      )}
      <a id="retry-button" href="/">
        Test another
      </a>
    </PaymentWrapper>
  )
}
