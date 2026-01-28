"use client"

import { useState } from "react"
import ChatInterface from "./ChatInterface"

interface SidebarChatProps {
  className?: string
  initialMessage?: string
}

export default function SidebarChat({
  className = "",
  initialMessage,
}: SidebarChatProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-10 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
      >
        {isOpen ? "Close Chat" : "Chat Assistant"}
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 max-w-[calc(100vw-2rem)] z-50 bg-white shadow-2xl">
          <ChatInterface
            variant="sidebar"
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            initialMessage={initialMessage}
          />
        </div>
      )}
    </div>
  )
}
