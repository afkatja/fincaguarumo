"use client"

import { useBookingCore } from "../../app/providers/BookingCoreProvider"
import { usePageContext } from "../../hooks/usePageContext"
import ChatInterface from "./ChatInterface"
import { isChatbotEnabled } from "../../lib/featureFlags"

interface EmbeddedChatProps {
  className?: string
  initialMessage?: string
  context?: {
    page?: "homepage" | "villa-bruno" | "other"
    bookingData?: any
    propertyTitle?: string
  }
}

export default function EmbeddedChat({
  className = "",
  initialMessage,
  context,
}: EmbeddedChatProps) {
  // Check if chatbot feature is enabled
  if (!isChatbotEnabled()) {
    return null
  }

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
    <div data-testid="embedded-chat">
      <ChatInterface
        variant="embedded"
        className={className}
        initialMessage={initialMessage}
        context={{
          page: context?.page || page,
          bookingData: context?.bookingData || bookingData,
          propertyTitle: context?.propertyTitle,
        }}
      />
    </div>
  )
}
