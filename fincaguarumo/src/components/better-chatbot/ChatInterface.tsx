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
import Input from "../Input"
import Textarea from "../Textarea"
import { Button } from "../ui/button"

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
  const tGreetings = useTranslations("greetings")
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
      const greeting =
        initialMessage || getPersonalizedGreeting(chatContext, tGreetings)

      setMessages([{ role: "assistant", content: greeting }])
    }
  }, [locale, initialMessage, messages.length, chatContext, tGreetings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    // Add user message to state
    setMessages(prev => [...prev, { role: "user", content: userMessage }])

    // Build messages array for API call
    // Only include user messages in the history to comply with API requirements
    // The API expects: [system] → user → assistant → user → assistant...
    const userOnlyMessages = messages
      .filter(msg => msg.role === "user")
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

    const messagesWithUser = [
      ...userOnlyMessages,
      { role: "user", content: userMessage },
    ]

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesWithUser.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          locale,
          context: chatContext,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `Failed to get response: ${response.status} ${response.statusText}`,
        )
      }

      // Read the stream with proper error handling and cleanup
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""
      let buffer = ""

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // Process complete lines
            const lines = buffer.split("\n")
            buffer = lines.pop() || "" // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim()

              // Handle both SSE format and plain text content
              if (trimmedLine.startsWith("data: ")) {
                const data = trimmedLine.slice(6)
                if (data === "[DONE]" || data === "") continue

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content && typeof parsed.content === "string") {
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
                } catch (parseError) {
                  console.warn("Failed to parse SSE data:", data, parseError)
                }
              } else if (
                trimmedLine &&
                !trimmedLine.startsWith("event:") &&
                !trimmedLine.startsWith("id:")
              ) {
                // Treat as plain text content
                assistantMessage += trimmedLine + " "
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
            }
          }
        } finally {
          reader.releaseLock()
        }
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: t("errorMessage", {
            defaultValue:
              "Sorry, the assistant encountered an error. Please try again.",
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
          className={`fixed bottom-6 right-6 z-50 bg-guarumo-primary hover:bg-guarumo-secondary text-zinc-50 rounded-full p-4 shadow-lg transition-all duration-300 ${
            isOpen ? "scale-0" : "scale-100"
          }`}
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {isOpen && (
          <div
            className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-zinc-50 rounded-2xl shadow-2xl overflow-hidden ${className}`}
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
      <div
        className={`h-[calc(100dvh-var(--header-height))] transform translate-y-(--header-height) flex flex-col bg-zinc-50 ${className}`}
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
    )
  }

  // Embedded variant
  return (
    <div
      className={`flex flex-col bg-zinc-50 rounded-lg border overflow-hidden ${className}`}
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
  )
}

function ChatHeader({ onClose }: { onClose?: () => void }) {
  const t = useTranslations("bookingChat")
  return (
    <div className="flex items-center justify-between p-4 border-b bg-guarumo-primary text-zinc-50">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">
          {t("title", { defaultValue: "Booking Assistant" })}
        </h3>
      </div>
      {onClose && (
        <Button
          variant="ghost"
          onClick={onClose}
          className="p-1"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </Button>
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-auto flex flex-col justify-end">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.role === "user"
                ? "bg-guarumo-primary text-zinc-50"
                : "bg-zinc-100 text-zinc-900"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-zinc-100 rounded-2xl px-4 py-2">
            <Loader2 className="w-5 h-5 animate-spin text-guarumo-primary" />
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        onSubmit(e as any)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 mt-auto">
      <div className="flex gap-2 w-full items-end">
        <Textarea
          id="chat-user-input"
          required={false}
          errorMessage=""
          value={input}
          onChangeHandler={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("inputPlaceholder", {
            defaultValue: "Ask about booking...",
          })}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={isLoading || !input.trim()}
          className="mb-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </form>
  )
}
