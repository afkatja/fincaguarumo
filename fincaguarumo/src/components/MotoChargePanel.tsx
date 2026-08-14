"use client"

import { FormEvent, useState } from "react"
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import Input from "./Input"
import { Label } from "./ui/label"

type Props = {
  reservationId: string
  amount: number
  currency: string
  description?: string
  chargeEndpoint?: string
  onSucceeded?: (paymentIntentId: string) => void
  isManual?: boolean
  getAccessToken?: () => Promise<string | null>
  source?: string
}

type ChargeResponse = {
  paymentIntentId?: string
  error?: string
}

type Status =
  "idle" | "creating_payment_method" | "charging" | "succeeded" | "error"

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)

/**
 * Mount inside <Elements stripe={stripePromise}>.
 * The CardElement is hosted by Stripe; PAN, expiry, and CVC never reach Next.js,
 * Supabase, Netlify, or your own API route.
 */
export function MotoApiChargePanel({
  reservationId,
  amount,
  currency,
  description = "Booking.com VCC charge",
  chargeEndpoint = "/api/finance/moto-charge",
  onSucceeded,
  isManual = false,
  getAccessToken,
  source,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState(
    "Enter the active Booking.com VCC details.",
  )
  const [postalCode, setPostalCode] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements) return

    const card = elements.getElement(CardElement)
    if (!card) {
      setStatus("error")
      setMessage("Stripe Card Element is not ready.")
      return
    }
    if (!confirmed) {
      setStatus("error")
      setMessage(
        "Confirm the reservation, amount, and currency before charging.",
      )
      return
    }

    setStatus("creating_payment_method")
    setMessage("Securely tokenizing card data with Stripe…")

    try {
      const result = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: {
          address: postalCode.trim()
            ? { postal_code: postalCode.trim() }
            : undefined,
        },
      })

      if (result.error || !result.paymentMethod) {
        setStatus("error")
        setMessage(
          result.error?.message || "Stripe could not create a payment method.",
        )
        return
      }

      setStatus("charging")
      setMessage("Submitting the MOTO payment for authorization…")
      const accessToken = getAccessToken ? await getAccessToken() : null
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(chargeEndpoint, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          reservationId,
          paymentMethodId: result.paymentMethod.id,
          // These values are useful for UI validation/audit only. The server must
          // load the authoritative amount/currency from its reservation record.
          expectedAmount: amount,
          expectedCurrency: currency.toLowerCase(),
          description,
          isManual,
          source,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as ChargeResponse
      if (!response.ok || !body.paymentIntentId) {
        throw new Error(body.error || "The MOTO charge was not completed.")
      }

      setStatus("succeeded")
      setMessage(`Payment succeeded: ${body.paymentIntentId}`)
      setConfirmed(false)
      card.clear()
      setPostalCode("")
      onSucceeded?.(body.paymentIntentId)
    } catch (error) {
      setStatus("error")
      setMessage(
        error instanceof Error ? error.message : "The MOTO charge failed.",
      )
    }
  }

  const busy = status === "creating_payment_method" || status === "charging"

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            Booking.com VCC MOTO charge
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Card data is collected in Stripe-hosted fields and never sent to
            your app server.
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700">
          {status}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-zinc-50 p-4 text-sm">
        <div>
          <dt className="text-zinc-500">Reservation</dt>
          <dd className="mt-0.5 font-medium text-zinc-950">{reservationId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Exact charge</dt>
          <dd className="mt-0.5 font-medium text-zinc-950">
            {money(amount, currency)}
          </dd>
        </div>
      </dl>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <Label className="block text-sm font-medium text-zinc-800">
          Virtual card details
        </Label>
        <span className="mt-2 block rounded-lg border border-zinc-300 bg-white p-3">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  color: "#0f172a",
                  fontSize: "16px",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: "400",
                  "::placeholder": { color: "#64748b" },
                  iconColor: "#64748b",
                },
                invalid: { color: "#b91c1c" },
              },
            }}
          />
        </span>

        <Label className="block text-sm font-medium text-zinc-800">
          Billing postal code{" "}
          <span className="font-normal text-sm text-zinc-500">
            (only if Booking.com provides one)
          </span>
        </Label>

        <Input
          value={postalCode}
          onChange={event => setPostalCode(event.target.value)}
          autoComplete="off"
          inputMode="text"
          disabled={busy || status === "succeeded"}
          id="postal-code"
          type="text"
          placeholder="12345"
          errorMessage=""
          required={false}
        />

        <Label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-zinc-300"
            checked={confirmed}
            disabled={busy || status === "succeeded"}
            onChange={event => setConfirmed(event.target.checked)}
          />
          <span>
            I verified that this VCC is active and that the reservation, amount,
            and currency above are correct. I am charging it only for this
            accommodation reservation.
          </span>
        </Label>

        <button
          type="submit"
          disabled={!stripe || busy || !confirmed || status === "succeeded"}
          className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Processing…" : `Charge ${money(amount, currency)}`}
        </button>
      </form>

      {status === "error" && (
        <div
          className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
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
            <p className="text-sm font-medium text-red-800">Payment Error</p>
            <p className="text-sm text-red-700 mt-1">{message}</p>
          </div>
        </div>
      )}

      {status === "succeeded" && (
        <div
          className="mt-4 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg"
          role="status"
        >
          <svg
            className="w-5 h-5 text-guarumo-primary shrink-0 mt-0.5"
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
          <div className="flex-1">
            <p className="text-sm font-medium text-guarumo-primary">
              Payment Successful
            </p>
            <p className="text-sm text-guarumo-primary mt-1">{message}</p>
          </div>
        </div>
      )}

      {status !== "error" && status !== "succeeded" && (
        <p role="status" className="mt-4 text-sm text-zinc-600">
          {message}
        </p>
      )}
    </section>
  )
}
