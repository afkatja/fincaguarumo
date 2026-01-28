"use client"

import ChatInterface from "./ChatInterface"

interface EmbeddedChatProps {
  className?: string
  initialMessage?: string
}

export default function EmbeddedChat({
  className = "",
  initialMessage,
}: EmbeddedChatProps) {
  return (
    <ChatInterface
      variant="embedded"
      className={className}
      initialMessage={initialMessage}
    />
  )
}
