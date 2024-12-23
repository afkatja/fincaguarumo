"use client"
import React, { Suspense, use, useState } from "react"
import { useStripe } from "@stripe/react-stripe-js"

import PagesLayout from "../pagesLayout"
import icons from "@/components/icons"
import Loading from "../loading"
import { useSearchParams } from "next/navigation"
import Title from "../../../../components/Title"

const { Success, Info, Error } = icons

const STATUS_CONTENT_MAP: Record<
  string,
  { text: string; iconColor: string; icon: React.ReactNode }
> = {
  succeeded: {
    text: "Payment succeeded",
    iconColor: "#30B130",
    icon: <Success fill="#30B130" className="mr-4" />,
  },
  processing: {
    text: "Your payment is processing.",
    iconColor: "#6D6E78",
    icon: <Info fill="#6D6E78" className="mr-4" />,
  },
  requires_payment_method: {
    text: "Your payment was not successful, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" className="mr-4" />,
  },
  default: {
    text: "Something went wrong, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" className="mr-4" />,
  },
}

export default function CompletePage({ locale }: { locale: string }) {
  const searchParams = useSearchParams()

  const stripe = useStripe()

  const [status, setStatus] = useState<string | undefined>("default")

  const [paymentIntent, setPaymentIntent] = useState<
    Record<string, any> | null | undefined
  >(null)

  const [customerDetails, setCustomerDetails] = useState<
    Record<string, any> | null | undefined
  >(null)

  React.useEffect(() => {
    if (!stripe || paymentIntent) return
    const bookingDetails = searchParams.get("bookingDetails")
    if (bookingDetails) {
      setCustomerDetails(JSON.parse(bookingDetails))
    }
    const clientSecret = searchParams.get("payment_intent_client_secret")

    if (!clientSecret) return

    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({ paymentIntent: intent }) => {
        if (!intent) return
        setPaymentIntent(intent)

        setStatus(intent?.status)
      })
  }, [searchParams, stripe, paymentIntent])

  return (
    <Suspense fallback={<Loading />}>
      {status && paymentIntent && (
        <PagesLayout
          locale={locale}
          pageName="paymentComplete"
          title={STATUS_CONTENT_MAP[status].text}
          subtitle={`You paid $ ${paymentIntent?.amount / 100} for ${customerDetails?.bookingName}`}
          description={paymentIntent?.description}
        >
          <div className="w-11/12 mx-auto prose dark:prose-invert pb-8">
            <Title title={`Dear ${customerDetails?.name},`} titleClassName="" />
            <p>
              Your booking of the{" "}
              <strong>{customerDetails?.bookingName}</strong> for{" "}
              {customerDetails?.guests} guests on{" "}
              <strong>
                {new Date(customerDetails?.date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>{" "}
              has succeeded. An email with the confirmation has been sent to{" "}
              <strong>{customerDetails?.email}</strong>.
            </p>
            <p className="flex flex-wrap items-center">
              {STATUS_CONTENT_MAP[status].icon}
              Add to calendar
            </p>
          </div>
        </PagesLayout>
      )}
    </Suspense>
  )
}
