"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { MotoApiChargePanel } from "@/components/MotoChargePanel"
import PageLayout from "../../(pages)/pagesLayout"
import Input from "../../../../components/Input"
import { Button } from "../../../../components/ui/button"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"
import { Label } from "../../../../components/ui/label"
import AdminHeader from "@/components/AdminHeader"
import ErrorBoundary from "@/components/ErrorBoundary"

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

  const fetchBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setBookingData(null)
    setLoading(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        // Redirect to login with return URL
        const currentPath = window.location.pathname
        router.push(
          `/admin/login?redirectTo=${encodeURIComponent(currentPath)}`,
        )
        return
      }

      // Use external_reservation_id parameter to look up by booking.com/airbnb ID
      const params = new URLSearchParams()
      params.set("external_reservation_id", bookingId.trim())
      if (bookingSource) {
        params.set("source", bookingSource)
      }

      const response = await fetch(
        `/api/bookings?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

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
          {/* Progress Indicator */}
          {currentStep < 4 && (
            <div className="mb-6 flex items-center justify-center">
              {steps.slice(0, 3).map((step, index) => (
                <div key={step.id} className="flex items-center ">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step.id
                          ? "bg-guarumo-primary text-zinc-50"
                          : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {currentStep > step.id ? "✓" : step.id}
                    </div>
                    <span
                      className={`mt-2 text-xs ${
                        currentStep >= step.id
                          ? "text-guarumo-primary font-medium"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 lg:w-28 ${
                        currentStep > step.id
                          ? "bg-guarumo-primary"
                          : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step Navigation */}
          {currentStep > 1 && currentStep < 4 && (
            <div className="mb-4 flex justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1}
              >
                ← Back
              </Button>
              {currentStep < 3 && canProceedToStep3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Next →
                </Button>
              )}
            </div>
          )}

          {/* Step 1: Booking Lookup / Manual Entry */}
          {currentStep === 1 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950 mb-4">
                {manualMode ? "Manual Entry" : "Look Up Booking by External ID"}
              </h2>

              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setManualMode(!manualMode)
                    setError(null)
                    setBookingData(null)
                    setCurrentStep(1)
                  }}
                >
                  {manualMode ? "← Back to Look Up" : "Switch to Manual Entry"}
                </Button>
              </div>

              {!manualMode ? (
                <form onSubmit={fetchBooking} className="space-y-4">
                  <div className="space-y-4">
                    <Input
                      id="bookingId"
                      type="text"
                      required
                      labelText="External Reservation ID"
                      errorMessage="Enter the external reservation ID from booking.com, Airbnb, or VRBO"
                      value={bookingId}
                      onChange={e => setBookingId(e.target.value)}
                      disabled={loading}
                      placeholder="e.g., 123456789 (booking.com), HMJ3Y4K (Airbnb), etc."
                    />
                    <div>
                      <Label
                        htmlFor="bookingSource"
                        className="block text-sm font-medium text-zinc-700 mb-1"
                      >
                        Source Platform
                      </Label>
                      <select
                        id="bookingSource"
                        value={bookingSource}
                        onChange={e => setBookingSource(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none ring-0 focus:border-zinc-950"
                        disabled={loading}
                      >
                        <option value="booking">Booking.com</option>
                        <option value="airbnb">Airbnb</option>
                        <option value="vrbo">VRBO</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    disabled={loading || !bookingId.trim()}
                    className="mt-5"
                  >
                    {loading ? "Loading…" : "Look Up Booking"}
                  </Button>
                  {error && (
                    <div
                      className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                      role="alert"
                    >
                      <svg
                        className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                          Error
                        </p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <form className="space-y-4">
                  <Input
                    id="manualReservationId"
                    type="text"
                    required
                    labelText="External Reservation ID"
                    errorMessage="Enter the external reservation ID"
                    value={manualReservationId}
                    onChange={e => setManualReservationId(e.target.value)}
                    placeholder="e.g., 123456789 from booking.com/airbnb"
                  />
                  <Input
                    id="manualAmount"
                    type="number"
                    required
                    labelText="Amount (in cents)"
                    errorMessage="Enter the amount in cents (e.g., 10000 for $100.00)"
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    placeholder="Amount in cents (e.g., 10000 for $100.00)"
                    min="1"
                    step="1"
                  />
                  <div>
                    <Label
                      htmlFor="manualCurrency"
                      className="block text-sm font-medium text-zinc-700 mb-1"
                    >
                      Currency
                    </Label>
                    <select
                      id="manualCurrency"
                      value={manualCurrency}
                      onChange={e => setManualCurrency(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none ring-0 focus:border-zinc-950"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                      <option value="crc">CRC</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => {
                      if (!manualReservationId || !manualAmount) {
                        setError("Please fill in all fields")
                        return
                      }
                      const amountValue = parseInt(manualAmount, 10)
                      if (!Number.isFinite(amountValue) || amountValue < 1) {
                        setError("Amount must be a positive integer (in cents)")
                        return
                      }
                      setBookingData({
                        id: "manual",
                        total_price: amountValue,
                        currency: manualCurrency,
                        status: "pending",
                        guest_name: "Manual Entry",
                        check_in: new Date().toISOString(),
                        check_out: new Date().toISOString(),
                        source: "manual",
                        external_reservation_id: manualReservationId,
                      })
                      setError(null)
                      setCurrentStep(2)
                    }}
                  >
                    Continue to Payment
                  </Button>
                  {error && (
                    <div
                      className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                      role="alert"
                    >
                      <svg
                        className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-red-800 my-0! font-bold">
                          Error
                        </p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </section>
          )}

          {/* Step 2: Booking Details */}
          {currentStep === 2 && bookingData && (
            <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950 mb-4">
                {manualMode
                  ? "Manual Entry Details"
                  : "Booking Details (Read-Only)"}
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-zinc-50 p-4 text-sm">
                {manualMode ? (
                  <>
                    <div className="col-span-2">
                      <dt className="text-zinc-500">External Reservation ID</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950 font-mono">
                        {manualReservationId}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-500">Amount to Charge</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950 text-lg">
                        {formatMoney(
                          bookingData.total_price,
                          bookingData.currency,
                        )}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-500">Currency</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950 uppercase">
                        {bookingData.currency}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt className="text-zinc-500">Internal Booking ID</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950 font-mono">
                        {bookingData.id}
                      </dd>
                    </div>
                    {bookingData.external_reservation_id && (
                      <div>
                        <dt className="text-zinc-500">
                          External Reservation ID
                        </dt>
                        <dd className="mt-0.5 font-medium text-zinc-950 font-mono">
                          {bookingData.external_reservation_id}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-zinc-500">Guest</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950">
                        {bookingData.guest_name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Source</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950">
                        {bookingData.source}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Check-in</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950">
                        {bookingData.check_in}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Check-out</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950">
                        {bookingData.check_out}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-500">Amount to Charge</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950 text-lg">
                        {formatMoney(
                          bookingData.total_price,
                          bookingData.currency,
                        )}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-500">Currency</dt>
                      <dd className="mt-0.5 font-medium text-zinc-950 uppercase">
                        {bookingData.currency}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </section>
          )}

          {/* Step 3: Card Details */}
          <Elements stripe={stripePromise} key="finance-page-elements">
            <div
              className={currentStep === 3 && bookingData ? "block" : "hidden"}
            >
              {bookingData && (
                <MotoApiChargePanel
                  reservationId={
                    manualMode ? manualReservationId : bookingData.id
                  }
                  amount={bookingData.total_price}
                  currency={bookingData.currency}
                  description={
                    manualMode
                      ? `Manual VCC charge for reservation ${manualReservationId}`
                      : getDescription(bookingData)
                  }
                  chargeEndpoint="/api/admin/finance"
                  isManual={manualMode}
                  getAccessToken={getAccessToken}
                  onSucceeded={handlePaymentSuccess}
                  source={bookingData.source}
                />
              )}
            </div>
          </Elements>

          {/* Step 4: Payment Success */}
          {currentStep === 4 && paymentSuccess && (
            <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-guarumo-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-zinc-950 mb-2">
                  Payment Successful!
                </h2>
                <p className="text-zinc-600 mb-6">
                  Your payment has been processed successfully.
                </p>
                {bookingData && (
                  <div className="bg-zinc-50 rounded-lg p-4 text-left mb-6">
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-zinc-500">Amount Charged</dt>
                        <dd className="font-medium text-zinc-950 text-lg">
                          {formatMoney(
                            bookingData.total_price,
                            bookingData.currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Reservation ID</dt>
                        <dd className="font-medium text-zinc-950 font-mono">
                          {manualMode ? manualReservationId : bookingData.id}
                        </dd>
                      </div>
                      {paymentIntentId && (
                        <div>
                          <dt className="text-zinc-500">Payment Intent ID</dt>
                          <dd className="font-medium text-zinc-950 font-mono text-xs">
                            {paymentIntentId}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
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
            </section>
          )}
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
