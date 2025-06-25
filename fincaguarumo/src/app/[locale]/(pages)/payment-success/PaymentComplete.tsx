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
  Complete = "complete",
  Success = "succeeded",
  PaymentError = "requires_payment_method",
  Error = "default",
}

const STATUS_CONTENT_MAP: Record<
  string,
  { text: string; iconColor: string; icon: React.ReactNode }
> = {
  [Status.Success]: {
    text: "Booking succeeded",
    iconColor: "#30B130",
    icon: <Success fill="#30B130" className="mr-4" />,
  },
  [Status.Complete]: {
    text: "Booking succeeded",
    iconColor: "#30B130",
    icon: <Success fill="#30B130" className="mr-4" />,
  },
  [Status.PaymentError]: {
    text: "Your payment was not successful, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" className="mr-4" />,
  },
  [Status.Error]: {
    text: "Something went wrong, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" className="mr-4" />,
  },
  // default: {
  //   text: "Your payment is processing.",
  //   iconColor: "#6D6E78",
  //   icon: <Info fill="#6D6E78" className="mr-4" />,
  // },
}

export default function CompletePage({ locale }: { locale: string }) {
  const searchParams = useSearchParams()

  const stripe = useStripe()

  const { bookingData, setBookingData } = useBooking()

  const [status, setStatus] = useState<string | undefined>("default")

  const [paymentIntent, setPaymentIntent] = useState<
    Record<string, any> | null | undefined
  >(null)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    if (!stripe) return
    const clientSecret = searchParams.get("payment_intent_client_secret")
    const sessionId = searchParams.get("session_id")

    if (clientSecret && !paymentIntent) {
      const fetchData = async () => {
        const { paymentIntent: intent } =
          await stripe.retrievePaymentIntent(clientSecret)
        if (!intent) return
        setPaymentIntent(intent)
        setStatus(intent?.status)
      }
      fetchData()
    } else if (sessionId && !session) {
      const fetchSessionStatus = async () => {
        const response = await fetch(
          `/api/session-status?session_id=${sessionId}`
        )
        if (!response.ok) return
        const data = await response.json()

        setSession(data.session)
        setStatus(data.session?.status)
      }
      fetchSessionStatus()
    }
  }, [searchParams, stripe, paymentIntent, session])

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
  }, [searchParams, bookingData, status])

  const getBookingTitle = () => {
    return bookingData.bookingDetails.title || "Villa Bruno Stay"
  }

  const getBookingLocation = () => {
    return bookingData.bookingDetails.location || "Finca Guarumo"
  }

  const getBookingDescription = () => {
    return bookingData.bookingDetails.description || ""
  }

  return (
    <Suspense fallback={<Loading />}>
      {!status && !paymentIntent && !session ? (
        <Loading />
      ) : (
        <PagesLayout
          locale={locale}
          pageName="paymentComplete"
          title={`Dear ${bookingData.customerDetails?.name}, ${STATUS_CONTENT_MAP[status!].text}`}
          subtitle={`You paid $ ${(paymentIntent?.amount || session.amount_total) / 100} for ${getBookingTitle()} at ${getBookingLocation()}`}
          description={getBookingDescription()}
        >
          <div className="w-11/12 mx-auto prose dark:prose-invert pb-8">
            <div className="flex">
              <div className="mt-6">{STATUS_CONTENT_MAP[status!].icon}</div>
              {(status === Status.Success || status == Status.Complete) && (
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
                  title: getBookingTitle(),
                  description: getBookingDescription(),
                  start:
                    bookingData.bookingDetails?.checkIn ??
                    bookingData.bookingDetails?.date,
                  duration: bookingData.bookingDetails?.duration,
                  location: getBookingLocation(),
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
