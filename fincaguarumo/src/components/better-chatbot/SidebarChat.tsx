"use client"

import { useState } from "react"
import { useBooking } from "@/app/providers/BookingProvider"
import { usePageContext } from "@/hooks/usePageContext"
import ChatInterface from "./ChatInterface"

interface SidebarChatProps {
  className?: string
  initialMessage?: string
  propertyTitle?: string
}

export default function SidebarChat({
  className = "",
  initialMessage,
  propertyTitle,
}: SidebarChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { bookingData } = useBooking()
  const { page } = usePageContext()

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-10 bg-guarumo-primary hover:bg-guarumo-secondary text-zinc-50 px-4 py-2 rounded-lg shadow-lg transition-colors"
      >
        {isOpen ? "Close Chat" : "Chat Assistant"}
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 max-w-[calc(100vw-2rem)] z-50 bg-zinc-50 shadow-2xl">
          <ChatInterface
            variant="sidebar"
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            initialMessage={initialMessage}
            context={{
              page,
              bookingData,
              propertyTitle,
            }}
          />
        </div>
      )}
    </div>
  )
}
