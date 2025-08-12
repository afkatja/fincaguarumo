"use client"
import React, { Suspense, useEffect, useRef, useState } from "react"
import { useStripe } from "@stripe/react-stripe-js"

import PagesLayout from "../pagesLayout"
import icons from "@/components/icons"
import Loading from "../loading"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
    icon: <Success fill="#30B130" className="mr-4" title="Success" />,
  },
  [Status.Complete]: {
    text: "Booking succeeded",
    iconColor: "#30B130",
    icon: <Success fill="#30B130" className="mr-4" title="Success" />,
  },
  [Status.PaymentError]: {
    text: "Your payment was not successful, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" className="mr-4" title="Error" />,
  },
  [Status.Error]: {
    text: "Something went wrong, please try again.",
    iconColor: "#DF1B41",
    icon: <Error fill="#DF1B41" className="mr-4" title="Error" />,
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

  const { bookingData } = useBooking()

  const pathname = usePathname()
  const router = useRouter()

  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const emailSentRef = useRef(false)

  const [paymentIntent, setPaymentIntent] = useState<
    Record<string, any> | null | undefined
  >(null)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const clientSecret = searchParams.get("payment_intent_client_secret")
    const sessionId = searchParams.get("session_id")

    // If neither parameter is present, we can't fetch payment data
    if (!clientSecret && !sessionId) {
      setIsLoading(false)
      return
    }

    // Handle payment intent with client secret (requires Stripe)
    if (clientSecret && stripe && !paymentIntent) {
      const fetchData = async () => {
        try {
          const { paymentIntent: intent } =
            await stripe.retrievePaymentIntent(clientSecret)
          if (!intent) return
          setPaymentIntent(intent)
          setStatus(intent?.status)
          setIsLoading(false)
        } catch (error) {
          console.error("Error retrieving payment intent:", error)
          setIsLoading(false)
        }
      }
      fetchData()
    }

    // Handle session-based payment (doesn't require Stripe)
    else if (sessionId && !session) {
      const fetchSessionStatus = async () => {
        try {
          const response = await fetch(
            `/api/session-status?session_id=${sessionId}`
          )
          if (!response.ok) {
            console.error("Failed to fetch session status")
            setIsLoading(false)
            return
          }
          const data = await response.json()
          setSession(data.session)
          setStatus(data.session?.status)
          setIsLoading(false)
        } catch (error) {
          console.error("Error fetching session status:", error)
          setIsLoading(false)
        }
      }
      fetchSessionStatus()
    }

    // If we have a client secret but stripe isn't loaded yet, keep loading
    else if (clientSecret && !stripe) {
      // Stripe is still loading, keep isLoading true
      return
    }
  }, [searchParams, stripe, paymentIntent, session])

  // useEffect(() => {
  //   const sendConfirmationEmail = async () => {
  //     emailSentRef.current = true
  //     try {
  //       const response = await fetch("/api/send-confirmation-email", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           customerDetails: bookingData.customerDetails,
  //           bookingDetails: {
  //             ...bookingData.bookingDetails,
  //             type: bookingData.type,
  //           },
  //         }),
  //       })

  //       // Clear booking data after successful payment
  //       if (
  //         response?.ok &&
  //         (status === Status.Success || status === Status.Complete)
  //       ) {
  //         localStorage.removeItem("bookingData")
  //       }

  //       if (!response.ok) {
  //         console.error("Failed to send confirmation email")
  //         return
  //       }
  //     } catch (error) {
  //       console.error("Error sending confirmation email:", error)
  //     }
  //   }

  //   const emailSent = localStorage.getItem("emailSent")

  //   if (
  //     (searchParams.get("payment_intent_client_secret") ||
  //       searchParams.get("session_id")) &&
  //     status === Status.Complete &&
  //     !emailSent &&
  //     !emailSentRef.current
  //   ) {
  //     sendConfirmationEmail()
  //   }
  // }, [searchParams, bookingData, status])

  useEffect(() => {
    // Check if this is a page reload
    const isReload = sessionStorage.getItem("payment-success-loaded")
    if (isReload) {
      router.replace(`/${locale}`)
      sessionStorage.removeItem("payment-success-loaded")
    } else {
      sessionStorage.setItem("payment-success-loaded", "true")
    }
    if (pathname !== `/${locale}/payment-success`) {
      setSession(null)
      setStatus(null)
      setPaymentIntent(null)
      // if (localStorage.getItem("emailSent"))
      //   localStorage.removeItem("emailSent")
    }
  }, [router, locale, pathname])

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
      {isLoading ? (
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
