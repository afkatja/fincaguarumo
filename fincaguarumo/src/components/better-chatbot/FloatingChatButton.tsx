"use client"

import { useState } from "react"
import { loadBookingDataFromLocalStorage } from "@/types"
import { usePageContext } from "@/hooks/usePageContext"
import ChatInterface from "./ChatInterface"

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const bookingData = loadBookingDataFromLocalStorage()
  const { page } = usePageContext()

  return (
    <ChatInterface
      variant="floating"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      context={{
        page,
        bookingData: bookingData || undefined,
      }}
    />
  )
}
