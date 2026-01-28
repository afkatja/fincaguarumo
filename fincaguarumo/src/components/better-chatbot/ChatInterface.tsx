"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { getLanguagePrompt } from "@/lib/better-chatbot/config"
import {
  ChatContext,
  getPersonalizedGreeting,
  detectUserIntent,
} from "@/lib/better-chatbot/context-aware"

interface Message {
  role: "user" | "assistant" | "tool"
  content: string
  toolCallId?: string
}

interface ChatInterfaceProps {
  variant?: "floating" | "sidebar" | "embedded"
  isOpen?: boolean
  onToggle?: () => void
  className?: string
  initialMessage?: string
  context?: Partial<ChatContext>
}

export default function ChatInterface({
  variant = "floating",
  isOpen: controlledIsOpen,
  onToggle,
  className = "",
  initialMessage,
  context,
}: ChatInterfaceProps) {
  const { locale } = useParams()
  const t = useTranslations("bookingChat")
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const toggleOpen = onToggle || (() => setInternalIsOpen(!internalIsOpen))

  // Build chat context
  const chatContext: ChatContext = {
    page: context?.page || "other",
    locale: locale as string,
    bookingData: context?.bookingData,
    propertyTitle: context?.propertyTitle,
    userIntent: context?.userIntent,
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = initialMessage || getPersonalizedGreeting(chatContext)
      setMessages([{ role: "assistant", content: greeting }])
    }
  }, [locale, initialMessage, messages.length, chatContext])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          locale,
          context: chatContext,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      // Read the stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Parse the stream chunk (simplified - in production, use proper stream parsing)
          const lines = chunk.split("\n")
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantMessage += parsed.content
                  setMessages(prev => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage?.role === "assistant") {
                      lastMessage.content = assistantMessage
                    } else {
                      newMessages.push({
                        role: "assistant",
                        content: assistantMessage,
                      })
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
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
    } finally {
      setIsLoading(false)
    }
  }

  // Render different variants
  if (variant === "floating") {
    return (
      <>
        <button
          onClick={toggleOpen}
          className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 ${
            isOpen ? "scale-0" : "scale-100"
          }`}
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {isOpen && (
          <div
            className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden ${className}`}
          >
            <ChatHeader onClose={toggleOpen} />
            <ChatBody
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
            />
            <ChatFooter
              input={input}
              setInput={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        )}
      </>
    )
  }

  if (variant === "sidebar") {
    return (
      <div className={`h-full flex flex-col bg-white border-l ${className}`}>
        <ChatHeader onClose={toggleOpen} />
        <ChatBody
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
        <ChatFooter
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    )
  }

  // Embedded variant
  return (
    <div className={`flex flex-col bg-white rounded-lg border ${className}`}>
      <ChatHeader onClose={toggleOpen} />
      <ChatBody
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />
      <ChatFooter
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}

function ChatHeader({ onClose }: { onClose?: () => void }) {
  const t = useTranslations("bookingChat")
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">
          {t("title", { defaultValue: "Booking Assistant" })}
        </h3>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-blue-700 rounded transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

function ChatBody({
  messages,
  isLoading,
  messagesEndRef,
}: {
  messages: Message[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl px-4 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

function ChatFooter({
  input,
  setInput,
  onSubmit,
  isLoading,
}: {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}) {
  const t = useTranslations("bookingChat")
  return (
    <form onSubmit={onSubmit} className="p-4 border-t">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("inputPlaceholder", {
            defaultValue: "Ask about booking...",
          })}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  )
}
