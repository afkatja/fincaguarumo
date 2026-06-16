"use client"

import { useState } from "react"
import { useBookingCore } from "../../app/providers/BookingCoreProvider"
import { usePageContext } from "../../hooks/usePageContext"
import { cn } from "../../lib/utils"
import ChatInterface from "./ChatInterface"
import { Button } from "../ui/button"
import { MessageCircle } from "lucide-react"

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
    <div className={cn("fixed bottom-34 w-full z-10", className)}>
      <div className="w-11/12 mx-auto flex items-center ">
        <Button onClick={() => setIsOpen(!isOpen)} className="ml-auto">
          <MessageCircle className="mr-2" />
          {isOpen ? "Close Chat" : "Chat Assistant"}
        </Button>

        {isOpen && (
          <div className="fixed inset-y-0 right-0 w-96 max-w-[calc(100vw-2rem)] z-50 shadow-2xl">
            <ChatInterface
              variant="sidebar"
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
    </div>
  )
}
