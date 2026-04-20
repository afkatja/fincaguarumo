"use client"

import { useState } from "react"
import { useBookingCore } from "../../app/providers/BookingCoreProvider"
import { usePageContext } from "../../hooks/usePageContext"
import ChatInterface from "./ChatInterface"

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { state } = useBookingCore()
  const bookingData = {
    source: state.data.source,
    customerDetails: state.data.customerDetails,
    bookingDetails: {
      type: state.data.bookingType || "tour",
      title: state.data.bookingDetails.title,
      description: state.data.bookingDetails.description,
      duration: 0,
      location: state.data.bookingDetails.location,
      body: "",
      date: state.data.dates.date || new Date(),
      checkIn: state.data.dates.checkIn,
      checkOut: state.data.dates.checkOut,
      guests: state.data.guests,
      price: 0,
      basePrice: state.data.baseUnitPrice,
      totalPrice: state.data.totalPrice,
      currency: state.data.currency,
      geo: { lat: 0, lng: 0 },
    },
    pricingRules: state.data.pricingRules,
  }
  const { page } = usePageContext()

  return (
    <ChatInterface
      variant="floating"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      context={{
        page,
        bookingData,
      }}
    />
  )
}
