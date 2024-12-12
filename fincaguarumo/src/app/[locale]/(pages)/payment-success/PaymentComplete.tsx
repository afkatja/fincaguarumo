"use client"
import React, { Suspense, useState } from "react"
import { useStripe } from "@stripe/react-stripe-js"

import PagesLayout from "../pagesLayout"
import icons from "@/components/icons"
import Loading from "../loading"

const { Success, Info, Error } = icons

const STATUS_CONTENT_MAP: Record<
  string,
  { text: string; iconColor: string; icon: React.ReactNode }
> = {
  succeeded: {
    text: "Payment succeeded",
    iconColor: "#30B130",
    icon: <Success fill="#30B130" />,
  },
  processing: {
    text: "Your payment is processing.",
    iconColor: "#6D6E78",
    icon: <Info fill="#6D6E78" />,
  },
  requires_payment_method: {
    text: "Your payment was not successful, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" />,
  },
  default: {
    text: "Something went wrong, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" />,
  },
}

export default function CompletePage({ locale }: { locale: string }) {
  const stripe = useStripe()

  const [status, setStatus] = useState<string | undefined>("default")
  const [intentId, setIntentId] = useState<string | null | undefined>(null)
  const [paymentIntent, setPaymentIntent] = useState<
    Record<string, any> | null | undefined
  >(null)

  React.useEffect(() => {
    if (!stripe || paymentIntent) return

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    )

    if (!clientSecret) return

    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({ paymentIntent: intent }) => {
        if (!intent) return
        setPaymentIntent(intent)

        setStatus(intent?.status)
        setIntentId(intent?.id)
      })
  })

  console.log({ status, intentId, paymentIntent })

  return (
    <Suspense fallback={<Loading />}>
      {status && paymentIntent && (
        <PagesLayout
          locale={locale}
          pageName="paymentComplete"
          title={STATUS_CONTENT_MAP[status].text}
          subtitle={`You paid $ ${paymentIntent?.amount / 100}`}
          description={paymentIntent?.description}
        >
          <div className="w-11/12 mx-auto flex flex-wrap items-center prose">
            {STATUS_CONTENT_MAP[status].icon}
            Add to calendar
          </div>
        </PagesLayout>
      )}
    </Suspense>
  )
}
