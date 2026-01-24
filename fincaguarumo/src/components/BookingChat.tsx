"use client"
import { useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { bookingAgent } from "../lib/bookingAgent"

export default function BookingChat() {
  const { locale } = useParams()
  const t = useTranslations("bookingChat")
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content: t("initialMessage", {
        defaultValue: "Hello! How can I help you book Villa Bruno today?",
      }),
    },
  ])
  const [input, setInput] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: input }])
    setInput("")

    // Get assistant response
    try {
      const response = await bookingAgent.client.chat.complete({
        messages: [...messages, { role: "user" as const, content: input }],
        model: "open-mistral-nemo",
      })

      const assistantMessage = response.choices[0].message.content
      setMessages(prev => [
        ...prev,
        {
          role: "assistant" as const,
          content:
            typeof assistantMessage === "string"
              ? assistantMessage
              : JSON.stringify(assistantMessage),
        },
      ])
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: t("errorMessage", {
            defaultValue: "Sorry, I encountered an error. Please try again.",
          }),
        },
      ])
    }
  }

  return (
    <div className="booking-chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("inputPlaceholder", {
            defaultValue: "Ask about booking...",
          })}
        />
        <button type="submit">
          {t("sendButton", { defaultValue: "Send" })}
        </button>
      </form>
    </div>
  )
}
