"use client"
import React, { Suspense, useEffect, useState } from "react"
import { useStripe } from "@stripe/react-stripe-js"

import PagesLayout from "../pagesLayout"
import icons from "@/components/icons"
import Loading from "../loading"
import { useParams, useSearchParams } from "next/navigation"
import { createNavigation } from "next-intl/navigation"
import AddToCalendar from "@/components/AddToCalendar"
import { useBookingCore } from "../../../providers/BookingCoreProvider"

const { Success, Info, Error } = icons

enum Status {
  Complete = "complete",
  Success = "succeeded",
  PaymentError = "requires_payment_method",
  Error = "error",
  Processing = "processing",
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
  [Status.Processing]: {
    text: "Your payment is processing.",
    iconColor: "#6D6E78",
    icon: <Info fill="#6D6E78" className="mr-4" />,
  },
}

export default function CompletePage() {
  const { usePathname, useRouter, redirect } = createNavigation()
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useParams()
  const searchParams = useSearchParams()

  const stripe = useStripe()

  const { state } = useBookingCore()

  // Get combined booking data based on booking type
  const bookingData: any = state.data || {
    title: "",
    description: "",
    location: "",
  }

  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
          setStatus(Status.Error)
        }
      }
      fetchData()
    }

    // Handle session-based payment (doesn't require Stripe)
    else if (sessionId && !session) {
      const fetchSessionStatus = async () => {
        try {
          const response = await fetch(
            `/api/session-status?session_id=${sessionId}`,
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

  useEffect(() => {
    const clientSecret = searchParams.get("payment_intent_client_secret")
    const sessionId = searchParams.get("session_id")

    // Check if this is a reload scenario:
    // - No payment parameters in URL
    // - No booking data available
    // - Payment success flag already set from previous visit
    const isReload = sessionStorage.getItem("payment-success-loaded") === "true"
    const hasPaymentParams = clientSecret || sessionId
    const hasBookingData = state.data && Object.keys(state.data).length > 0

    if (isReload && !hasPaymentParams && !hasBookingData) {
      // This is definitely a reload with no data - redirect to home
      redirect({ href: "/", locale: (locale as string) ?? "en" })
      sessionStorage.removeItem("payment-success-loaded")
      return
    }

    if (!isReload && (hasPaymentParams || hasBookingData)) {
      // First successful visit with data - set the flag
      sessionStorage.setItem("payment-success-loaded", "true")
    }

    // Clear state if we're not on the payment success page
    if (pathname !== `/payment-success`) {
      setSession(null)
      setStatus(null)
      setPaymentIntent(null)
    }
  }, [router, locale, pathname, searchParams, state.data, redirect])

  const getBookingTitle = () => {
    return bookingData.bookingDetails?.title || "Villa Bruno Stay"
  }

  const getBookingLocation = () => {
    return bookingData.bookingDetails?.location || "Finca Guarumo"
  }

  const getBookingDescription = () => {
    return bookingData.bookingDetails?.description || ""
  }

  return (
    <Suspense fallback={<Loading className="absolute" />}>
      {isLoading ? (
        <Loading className="absolute" />
      ) : (
        <PagesLayout
          pageName="paymentComplete"
          title={
            status
              ? `Dear ${bookingData.customerDetails?.name}, ${STATUS_CONTENT_MAP[status]?.text}`
              : "Processing your payment..."
          }
          subtitle={
            status
              ? `You paid $ ${(paymentIntent?.amount || (session?.amount_total as number)) / 100} for ${getBookingTitle()} at ${getBookingLocation()}`
              : ""
          }
          description={getBookingDescription()}
        >
          <div className="w-11/12 mx-auto prose dark:prose-invert pb-8">
            <div className="flex">
              {status && (
                <div className="mt-6">{STATUS_CONTENT_MAP[status].icon}</div>
              )}
              {(status === Status.Success || status == Status.Complete) && (
                <p>
                  Your booking of the <strong>{getBookingTitle()}</strong> for{" "}
                  {bookingData.guests} guests on{" "}
                  <strong>
                    {new Date(
                      bookingData.dates?.checkIn ??
                        bookingData.bookingDetails?.date,
                    ).toLocaleDateString(locale, {
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
                  uid: paymentIntent?.id || session?.id,
                  source: "direct",
                  title: getBookingTitle(),
                  description: getBookingDescription(),
                  checkIn:
                    bookingData.dates?.checkIn ?? bookingData.dates?.date,
                  checkOut:
                    bookingData.dates?.checkOut ?? bookingData.dates?.date,
                  url:
                    typeof window !== "undefined" ? window.location.href : "",
                  location: getBookingLocation(),
                }}
              />
            </div>
          </div>
        </PagesLayout>
      )}
    </Suspense>
  )
}
