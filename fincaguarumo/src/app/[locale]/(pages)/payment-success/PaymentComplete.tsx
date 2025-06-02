"use client"
import React, { Suspense, useEffect, useState } from "react"
import { useStripe } from "@stripe/react-stripe-js"

import PagesLayout from "../pagesLayout"
import icons from "@/components/icons"
import Loading from "../loading"
import { useSearchParams } from "next/navigation"
// import Title from "../../../../components/Title"
import AddToCalendar from "../../../../components/AddToCalendar"
import { useBooking } from "../../BookingProvider"

const { Success, Info, Error } = icons

enum Status {
  Success = "succeeded",
  PaymentError = "requires_payment_method",
  Error = "default",
}

const STATUS_CONTENT_MAP: Record<
  string,
  { text: string; iconColor: string; icon: React.ReactNode }
> = {
  succeeded: {
    text: "Booking succeeded",
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

  const { bookingData, setBookingData } = useBooking()

  const [status, setStatus] = useState<string | undefined>("default")

  const [paymentIntent, setPaymentIntent] = useState<
    Record<string, any> | null | undefined
  >(null)

  useEffect(() => {
    if (!stripe || paymentIntent) return
    const clientSecret = searchParams.get("payment_intent_client_secret")

    if (!clientSecret) return

    const fetchData = async () => {
      const { paymentIntent: intent } =
        await stripe.retrievePaymentIntent(clientSecret)
      if (!intent) return
      setPaymentIntent(intent)
      setStatus(intent?.status)
    }
    fetchData()
  }, [searchParams, stripe, paymentIntent])

  useEffect(() => {
    const sendConfirmationEmail = async () => {
      try {
        const response = await fetch("/api/send-confirmation-email", {
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

        // Clear booking data after successful payment
        if (response?.ok && status === Status.Success) {
          localStorage.removeItem("bookingData")
        }

        if (!response.ok) {
          console.error("Failed to send confirmation email")
          return
        }
      } catch (error) {
        console.error("Error sending confirmation email:", error)
      }
    }

    if (searchParams.get("payment_intent_client_secret")) {
      sendConfirmationEmail()
    }
  }, [searchParams, bookingData])

  const getBookingTitle = () => {
    return bookingData.bookingDetails.title || "Villa Bruno Stay"
  }

  const getBookingLocation = () => {
    return bookingData.bookingDetails.location || "Finca Guarumo"
  }
  return (
    <Suspense fallback={<Loading />}>
      {status && paymentIntent && (
        <PagesLayout
          locale={locale}
          pageName="paymentComplete"
          title={`Dear ${bookingData.customerDetails?.name}, ${STATUS_CONTENT_MAP[status].text}`}
          subtitle={`You paid $ ${paymentIntent?.amount / 100} for ${getBookingTitle()} at ${getBookingLocation()}`}
          description={paymentIntent?.description}
        >
          <div className="w-11/12 mx-auto prose dark:prose-invert pb-8">
            <div className="flex">
              <div className="mt-6">{STATUS_CONTENT_MAP[status].icon}</div>
              {status === Status.Success && (
                <p>
                  Your booking of the <strong>{getBookingTitle()}</strong> for{" "}
                  {bookingData.bookingDetails?.guests} guests on{" "}
                  <strong>
                    {new Date(
                      bookingData.bookingDetails.checkIn ??
                        bookingData.bookingDetails?.date
                    ).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>{" "}
                  has succeeded. An email with the confirmation has been sent to{" "}
                  <strong>{bookingData.customerDetails?.email}</strong>.
                </p>
              )}
              {status === Status.PaymentError && (
                <p>Your payment was not successful. Please try again.</p>
              )}
              {status === Status.Error && (
                <p>Something went wrong. Please try again.</p>
              )}
            </div>

            <div className="mt-4">
              <AddToCalendar
                event={{
                  title: bookingData.bookingDetails?.title,
                  description: paymentIntent.description,
                  start: bookingData.bookingDetails?.date,
                  duration: bookingData.bookingDetails?.duration,
                  location: bookingData.bookingDetails?.location,
                  geo: bookingData.bookingDetails?.geo,
                }}
              />
            </div>
          </div>
        </PagesLayout>
      )}
    </Suspense>
  )
}
