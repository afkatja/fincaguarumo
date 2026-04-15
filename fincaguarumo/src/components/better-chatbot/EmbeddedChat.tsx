"use client"

import { useBooking } from "@/app/providers/BookingProvider"
import { usePageContext } from "@/hooks/usePageContext"
import ChatInterface from "./ChatInterface"

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
  const { bookingData } = useBooking()
  const { page } = usePageContext()

  return (
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
  )
}
