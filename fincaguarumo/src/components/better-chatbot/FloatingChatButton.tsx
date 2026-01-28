"use client"

import { useState } from "react"
import ChatInterface from "./ChatInterface"

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ChatInterface
      variant="floating"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    />
  )
}
