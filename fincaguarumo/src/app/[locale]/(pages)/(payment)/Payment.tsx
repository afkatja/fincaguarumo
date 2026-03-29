"use client"
import React, { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { loadStripe } from "@stripe/stripe-js"
import { CheckoutProvider } from "@stripe/react-stripe-js"
import CheckoutForm from "./CheckoutForm"
import { useVillaBooking } from "../../../providers/VillaBookingProvider"
import { useTourBooking } from "../../../providers/TourBookingProvider"
import { BOOKING_TYPE, serializeBookingData } from "@/types"
import Loading from "../loading"
import { useBookingCore } from "../../../providers/BookingCoreProvider"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
if (!publishableKey)
  console.warn(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will not work.",
  )

const stripePromise = loadStripe(publishableKey, {
  betas: ["custom_checkout_adaptive_pricing_2"],
})

const Payment = ({ ...props }: { [prop: string]: any }) => {
  // const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { state } = useBookingCore()
  const { fetchVillaDetailed } = useVillaBooking()
  const { fetchTourDetailed } = useTourBooking()
  const clientSecret = useRef(null)

  useEffect(() => {
    if (!state.data.bookingType) return
    if (clientSecret.current) return
    if (loading) return // Prevent concurrent fetches

    const fetchData = async () => {
      try {
        setLoading(true)

        const contentData =
          state.data.bookingType === BOOKING_TYPE.villa
            ? await fetchVillaDetailed()
            : await fetchTourDetailed()

        const completeBookingData = {
          source: state.data.source,
          customerDetails: state.data.customerDetails,
          bookingDetails: {
            type: state.data.bookingType!,
            title: contentData.title,
            description: contentData.description,
            duration: "duration" in contentData ? contentData.duration : 0,
            location: contentData.location || "",
            body: "",
            date: state.data.dates.date || new Date(),
            checkIn: state.data.dates.checkIn,
            checkOut: state.data.dates.checkOut,
            guests: state.data.guests,
            price: state.data.totalPrice,
            basePrice: state.data.baseUnitPrice,
            totalPrice: state.data.totalPrice,
            currency: state.data.currency,
            geo: contentData.geo || { lat: 0, lng: 0 },
          },
          pricingRules:
            "pricingRules" in contentData ? contentData.pricingRules || [] : [],
        }

        const serializedData = serializeBookingData(completeBookingData)

        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerDetails: serializedData.customerDetails,
            bookingDetails: {
              ...serializedData.bookingDetails,
              type: serializedData.bookingDetails.type,
            },
            pricingRules: serializedData.pricingRules,
          }),
        })

        const { clientSecret: clientSecretData } = await response.json()

        clientSecret.current = clientSecretData
      } catch (err) {
        console.error("Error creating payment session:", err)
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [state.data.bookingType])

  const appearance = {
    theme: "stripe" as const,
    variables: {
      fontFamily: "Poppins, sans-serif",
      colorPrimary: "#034b35",
      colorBackground: "#d1d5dc",
      colorText: "#1e2939",
      colorTextSecondary: "#1e2939",
      iconColor: "#1e2939",
    },
    rules: {},
  }

  const options = {
    // clientSecret: clientSecret.current,
    elementsOptions: { appearance },
    fetchClientSecret: async () => {
      return clientSecret.current || ""
    },
    adaptivePricing: { allowed: true },
  }

  if (!stripePromise || !clientSecret.current || loading)
    return (
      <div data-testid="booking-payment">
        <Loading className="absolute top-0" />
      </div>
    )
  return (
    <div data-testid="booking-payment">
      <CheckoutProvider options={options} stripe={stripePromise} {...props}>
        <CheckoutForm />
      </CheckoutProvider>
      <Image
        src="/images/stripe-badge.png"
        width={450}
        height={50}
        alt="stripe badge"
        className="w-full h-auto"
      />
    </div>
  )
}

export default Payment
