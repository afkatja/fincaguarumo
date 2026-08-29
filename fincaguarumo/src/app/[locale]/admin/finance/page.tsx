"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import MotoChargePanel from "@/components/MotoChargePanel"
import PageLayout from "../../(pages)/pagesLayout"
import Input from "../../../../components/Input"
import { Button } from "../../../../components/ui/button"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"
import AdminHeader from "@/components/AdminHeader"
import ErrorBoundary from "@/components/ErrorBoundary"
import { StatusAlert } from "@moto-pos/core/react"
import { Label } from "../../../../components/ui/label"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripeKey) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured")
}
const stripePromise = loadStripe(stripeKey)

type BookingData = {
  id: string
  total_price: number
  currency: string
  status: string
  guest_name: string
  check_in: string
  check_out: string
  source: string
  external_reservation_id?: string | null
}

const FinanceChargePage = () => {
  const router = useRouter()
  const { getAccessToken, loading: authLoading } = useSupabaseAuth()
  const [bookingId, setBookingId] = useState("")
  const [bookingSource, setBookingSource] = useState("booking")
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(true)
  const [manualReservationId, setManualReservationId] = useState("")
  const [manualAmount, setManualAmount] = useState("")
  const [manualCurrency, setManualCurrency] = useState("usd")
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  const steps = [
    { id: 1, title: "Booking Lookup" },
    { id: 2, title: "Booking Details" },
    { id: 3, title: "Card Details" },
    { id: 4, title: "Payment Success" },
  ]

  const canProceedToStep3 = bookingData !== null

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId)
    setPaymentSuccess(true)
    setCurrentStep(4)
  }

  const handleRequiresAction = (
    clientSecret: string,
    paymentIntentId: string,
  ) => {
    // For 3DS, we could redirect or handle inline
    // For now, show requires action state
    setPaymentIntentId(paymentIntentId)
    setCurrentStep(4)
  }

  const fetchBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setBookingData(null)
    setLoading(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        const currentPath = window.location.pathname
        router.push(
          `/admin/login?redirectTo=${encodeURIComponent(currentPath)}`,
        )
        return
      }

      const params = new URLSearchParams()
      params.set("external_reservation_id", bookingId.trim())
      if (bookingSource) {
        params.set("source", bookingSource)
      }

      const response = await fetch(`/api/bookings?${params.toString()}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to fetch booking")
      }

      const data = await response.json()
      setBookingData(data)
      setCurrentStep(2)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load booking",
      )
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)

  const getDescription = (booking: BookingData) =>
    `Booking.com VCC reservation ${booking.external_reservation_id || booking.id} - ${booking.guest_name} (${booking.check_in} to ${booking.check_out})`

  return (
    <>
      <AdminHeader />
      <PageLayout
        pageName="Finance Charge"
        title="Finance Charge"
        description="Charge a Booking.com VCC"
      >
        <div className="w-11/12 mx-auto py-5 space-y-6 prose lg:prose-lg">
          <Elements stripe={stripePromise} key="finance-page-elements">
            <MotoChargePanel />
          </Elements>

          <Button
            type="button"
            variant="default"
            onClick={() => {
              setCurrentStep(1)
              setBookingData(null)
              setPaymentSuccess(false)
              setPaymentIntentId(null)
              setBookingId("")
              setManualReservationId("")
              setManualAmount("")
              setError(null)
            }}
          >
            Process Another Payment
          </Button>
        </div>
      </PageLayout>
    </>
  )
}

const FinanceChargePageWithErrorBoundary = () => (
  <ErrorBoundary>
    <FinanceChargePage />
  </ErrorBoundary>
)

export default FinanceChargePageWithErrorBoundary
