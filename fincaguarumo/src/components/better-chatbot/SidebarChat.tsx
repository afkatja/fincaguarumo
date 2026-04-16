"use client"

import { useState } from "react"
import { loadBookingDataFromLocalStorage } from "@/types"
import { usePageContext } from "@/hooks/usePageContext"
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
  const bookingData = loadBookingDataFromLocalStorage()
  const { page } = usePageContext()

  return (
    <div className={`fixed bottom-34 w-full z-10 ${className}`}>
      <div className="w-11/12 mx-auto flex items-center ">
        <Button onClick={() => setIsOpen(!isOpen)} className="ml-auto">
          <MessageCircle className="mr-2" />
          {isOpen ? "Close Chat" : "Chat Assistant"}
        </Button>

        {isOpen && (
          <div className="fixed inset-y-0 right-0 w-96 max-w-[calc(100vw-2rem)] z-50 shadow-2xl">
            <ChatInterface
              variant="sidebar"
              isOpen={isOpen}
              onToggle={() => setIsOpen(!isOpen)}
              initialMessage={initialMessage}
              context={{
                page,
                bookingData: bookingData || undefined,
                propertyTitle,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
