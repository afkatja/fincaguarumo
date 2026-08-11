"use client"
import { FormEventHandler, useState, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  PaymentElement,
  useCheckoutElements,
  CurrencySelectorElement,
} from "@stripe/react-stripe-js/checkout"
import { Button } from "@/components/ui/button"
import Loading from "../loading"
import Title from "@/components/Title"

export default function CheckoutForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isElementReady, setIsElementReady] = useState(false)
  const [isFormComplete, setIsFormComplete] = useState(false)
  const [displayAmount, setDisplayAmount] = useState(0)
  const [displayCurrency, setDisplayCurrency] = useState("USD")

  const pathname = usePathname()
  const locale = useMemo(() => pathname?.split("/")[1] ?? "en", [pathname])

  const checkout = useCheckoutElements()

  useEffect(() => {
    if (checkout.type === "error") {
      setMessage(checkout.error?.message ?? "An error occurred")
    } else if (checkout.type === "loading") {
      setIsLoading(true)
    } else if (checkout.type === "success") {
      setIsLoading(false)
      const total = checkout.checkout.total?.total
      setDisplayCurrency(checkout.checkout.currency ?? "USD")
      setDisplayAmount(total?.minorUnitsAmount ?? 0)
    }
  }, [checkout])

  const formattedAmount = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayAmount / 100)
  }, [displayAmount, displayCurrency, locale])

  const handleSubmit: FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()

    if (checkout.type !== "success") {
      setMessage("Payment service not ready. Please try again.")
      return
    }

    const { confirm } = checkout.checkout
    if (!confirm) {
      setMessage("Confirmation not available. Please try again.")
      return
    }

    setMessage(null)
    setIsLoading(true)

    try {
      const confirmResult = await confirm()
      if (confirmResult.type === "error") {
        setMessage(confirmResult.error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const paymentElementOptions = {
    // layout: "accordion" as const,
  }

  const isCheckoutReady = checkout.type === "success"

  return (
    <>
      <CurrencySelectorElement />
      <Title title={`Pay ${formattedAmount} now`} titleClassName="my-4" />
      <form
        id="payment-form"
        onSubmit={handleSubmit}
        className="flex flex-col mt-4 min-h-100"
      >
        {message && (
          <p className="mb-4" aria-live="polite" role="status">
            {message}
          </p>
        )}
        <PaymentElement
          options={paymentElementOptions}
          onReady={() => {
            if (!isElementReady) {
              setIsElementReady(true)
            }
          }}
          onChange={e => setIsFormComplete(e.complete)}
        />
        <footer className="flex flex-wrap mt-auto pt-4">
          <Button
            name="pay-now-button"
            disabled={
              isLoading ||
              !isElementReady ||
              !isFormComplete ||
              !isCheckoutReady
            }
            className="ml-auto"
            type="submit"
          >
            {isLoading ? <Loading /> : "Pay now"}
          </Button>
        </footer>
      </form>
    </>
  )
}
