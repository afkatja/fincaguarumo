"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useCharge } from "@moto-pos/core/react"
import Input from "./Input"
import { Label } from "./ui/label"
import { StatusAlert, Button } from "@moto-pos/core/react"

type Props = {
  reservationId: string
  amount: number
  currency: string
  description?: string
  onSucceeded?: (paymentIntentId: string) => void
  onRequiresAction?: (clientSecret: string, paymentIntentId: string) => void
  getAccessToken?: () => Promise<string | null>
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)

export function MotoChargePanel({
  reservationId,
  amount,
  currency,
  description = "Booking.com VCC charge",
  onSucceeded,
  onRequiresAction,
  getAccessToken,
}: Props) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const [postalCode, setPostalCode] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(
    `booking-vcc:${reservationId}:${amount}:${currency.toLowerCase()}`
  )

  const chargeMutation = useCharge({
    endpoint: "/api/pos/charge",
    onSuccess: (result: { paymentIntentId: string; status: string; clientSecret?: string }) => {
      if (result.status === "succeeded") {
        onSucceeded?.(result.paymentIntentId)
      } else if (result.status === "requires_action") {
        onRequiresAction?.(result.clientSecret!, result.paymentIntentId)
      }
    },
    onError: (error: Error) => {
      // Error handled by mutation state
    },
  })

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements) return

    const card = elements.getElement(CardElement)
    if (!card) {
      chargeMutation.reset()
      return
    }
    if (!confirmed) {
      return
    }

    try {
      const result = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: {
          address: postalCode.trim() ? { postal_code: postalCode.trim() } : undefined,
        },
      })

      if (result.error || !result.paymentMethod) {
        return
      }

      const accessToken = getAccessToken ? await getAccessToken() : null

      if (!accessToken) {
        const currentPath = window.location.pathname
        router.push(`/admin/login?redirectTo=${encodeURIComponent(currentPath)}`)
        return
      }

      // Use the module's hook to charge
      chargeMutation.mutate({
        amount,
        currency: currency.toLowerCase(),
        paymentMethodId: result.paymentMethod.id,
        idempotencyKey,
      })
    } catch {
      // Error handled by mutation
    }
  }

  const busy = chargeMutation.isPending

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
          {chargeMutation.status === "pending" ? "charging" : chargeMutation.status}
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
          onChange={(event) => setPostalCode(event.target.value)}
          autoComplete="off"
          inputMode="text"
          disabled={busy || chargeMutation.status === "success"}
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
            disabled={busy || chargeMutation.status === "success"}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I verified that this VCC is active and that the reservation, amount,
            and currency above are correct. I am charging it only for this
            accommodation reservation.
          </span>
        </Label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={busy}
          disabled={!stripe || busy || !confirmed || chargeMutation.status === "success"}
        >
          {busy ? "Processing…" : `Charge ${money(amount, currency)}`}
        </Button>

        {chargeMutation.status === "error" && (
          <StatusAlert
            variant="error"
            title="Payment Error"
            message={chargeMutation.error?.message || "The MOTO charge failed."}
          />
        )}

        {chargeMutation.status === "success" && (
          <StatusAlert
            variant="success"
            title="Payment Successful"
            message={`Payment succeeded: ${chargeMutation.data?.paymentIntentId}`}
          />
        )}
      </form>
    </section>
  )
}