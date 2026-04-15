"use client"

import { useState } from "react"
import { useBooking } from "@/app/providers/BookingProvider"
import { usePageContext } from "@/hooks/usePageContext"
import ChatInterface from "./ChatInterface"

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { bookingData } = useBooking()
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
