"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ChatContext,
  getPersonalizedGreeting,
} from "@/lib/better-chatbot/context-aware"
import { patterns } from "@/lib/better-chatbot/patterns"
import { INPUT_LIMITS } from "@/lib/input-validation"
import Textarea from "../Textarea"
import { Button } from "../ui/button"
import { useBookingCore } from "../../app/providers/BookingCoreProvider"
import { isChatbotEnabled } from "../../lib/featureFlags"

// Extract relevant context from previous user messages
function extractUserContext(previousMessages: Message[]) {
  const context = {
    guestCount: null as number | null,
    nights: null as number | null,
    dates: [] as string[],
    amenities: [] as string[],
    interests: [] as string[],
  }

  previousMessages.forEach(msg => {
    const content = msg.content.toLowerCase()

    // Extract guest count (try all languages)
    Object.values(patterns.guests).forEach(pattern => {
      const match = content.match(pattern)
      if (match) {
        context.guestCount = parseInt(match[1])
      }
    })

    // Extract number of nights (try all languages)
    Object.values(patterns.nights).forEach(pattern => {
      const match = content.match(pattern)
      if (match) {
        context.nights = parseInt(match[1])
      }
    })

    // Extract dates (try all languages)
    Object.values(patterns.months).forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        context.dates.push(...matches)
      }
    })

    // Extract amenities (try all languages)
    Object.values(patterns.amenities).forEach(keywords => {
      keywords.forEach(amenity => {
        if (content.includes(amenity.toLowerCase())) {
          context.amenities.push(amenity)
        }
      })
    })

    // Extract general interests (try all languages)
    Object.values(patterns.interests).forEach(keywords => {
      keywords.forEach(interest => {
        if (content.includes(interest.toLowerCase())) {
          context.interests.push(interest)
        }
      })
    })
  })

  // Remove duplicates
  context.amenities = [...new Set(context.amenities)]
  context.interests = [...new Set(context.interests)]
  context.dates = [...new Set(context.dates)]

  return context
}

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
  // Check if chatbot feature is enabled
  if (!isChatbotEnabled()) {
    return null
  }

  const { locale } = useParams()
  const t = useTranslations("bookingChat")
  const tGreetings = useTranslations("greetings")
  const { state } = useBookingCore()

  // Transform CoreBookingData to match BookingData structure expected by chat interface
  const bookingData = {
    source: state.data.source,
    customerDetails: state.data.customerDetails,
    bookingDetails: {
      type: state.data.bookingType || "tour",
      title: state.data.bookingDetails.title,
      description: state.data.bookingDetails.description,
      duration: 0, // Not available in CoreBookingData
      location: state.data.bookingDetails.location,
      body: "", // Not available in CoreBookingData
      date: state.data.dates.date || new Date(),
      checkIn: state.data.dates.checkIn,
      checkOut: state.data.dates.checkOut,
      guests: state.data.guests,
      price: 0, // Legacy field
      basePrice: state.data.baseUnitPrice,
      totalPrice: state.data.totalPrice,
      currency: state.data.currency,
      geo: { lat: 0, lng: 0 }, // Not available in CoreBookingData
    },
    pricingRules: state.data.pricingRules,
  }
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isEmbeddedCollapsed, setIsEmbeddedCollapsed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState("")
  const [hasAssistantResponse, setHasAssistantResponse] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const toggleOpen = onToggle || (() => setInternalIsOpen(!internalIsOpen))

  // Build chat context (memoized to prevent unnecessary re-renders)
  const chatContext: ChatContext = useMemo(
    () => ({
      page: context?.page || "other",
      locale: locale as string,
      bookingData: bookingData,
      propertyTitle: context?.propertyTitle,
      userIntent: context?.userIntent,
    }),
    [
      context?.page,
      locale,
      bookingData,
      context?.propertyTitle,
      context?.userIntent,
    ],
  )

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      const chatBody = messagesEndRef.current?.parentElement
      if (chatBody) {
        // Get the actual header height to calculate proper scroll offset
        const headerElement = chatBody.previousElementSibling as HTMLElement
        const headerHeight = headerElement?.offsetHeight || 0
        // Add a small buffer (20px) to ensure content isn't flush against header
        const scrollOffset = headerHeight + 20
        chatBody.scrollTop = chatBody.scrollHeight - scrollOffset
      }
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    scrollToBottom()
  }, [messages])

  // Initialize with greeting message (stable dependencies)
  useEffect(() => {
    if (messages.length === 0) {
      const greeting =
        initialMessage || getPersonalizedGreeting(chatContext, tGreetings)

      setMessages([{ role: "assistant", content: greeting }])
    }
  }, [locale, initialMessage, messages.length]) // Only depend on stable values

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    // Add user message to state
    setMessages(prev => [...prev, { role: "user", content: userMessage }])

    // Build messages array for API call - only send current user message for response
    // but extract context from previous messages for better understanding
    const previousUserMessages = messages
      .filter(msg => msg.role === "user")
      .slice(-3) // Keep last 3 user messages for context

    const messagesForAPI = [{ role: "user", content: userMessage }]

    // Build enhanced context with previous user preferences
    const enhancedContext = {
      ...chatContext,
      previousQueries: previousUserMessages.map(msg => msg.content),
      extractedContext: extractUserContext(previousUserMessages),
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForAPI,
          locale,
          context: enhancedContext,
        }),
      })

      if (!response.ok) {
        console.error("Failed to parse chat response", response)
        throw new Error(
          `Failed to get response: ${response.status} ${response.statusText}`,
        )
      }

      // Read the stream with proper error handling and cleanup
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""
      let buffer = ""

      // Reset progress message when starting new request
      setProgressMessage("")
      setHasAssistantResponse(false)

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // split by newlines because you send `...\n`
            const lines = buffer.split("\n")
            buffer = lines.pop() || "" // keep incomplete line

            for (const line of lines) {
              if (!line.trim()) continue

              console.log("🔍 UI processing line:", line)

              // line looks like: 0:"Checking availability..."

              const match = line.match(/^(\d+):(.*)$/)
              const id = match?.[1]
              const payload = match?.[2]
              console.log(
                "📝 Parsed - ID:",
                id,
                "Payload preview:",
                payload?.substring(0, 50),
              )

              if (match && payload) {
                if (id === "0") {
                  try {
                    const parsed = JSON.parse(payload)
                    if (
                      parsed.type === "progress" &&
                      typeof parsed.message === "string"
                    ) {
                      setProgressMessage(parsed.message)
                    }
                  } catch {
                    // ignore
                  }
                  continue

                  // non-zero IDs → treat as normal AI chunks or ignore
                } else {
                  // normal assistant text; append to the answer
                  assistantMessage += payload

                  // Mark that we've received assistant response
                  if (!hasAssistantResponse) {
                    setHasAssistantResponse(true)
                  }

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
              } else {
                console.log(
                  "⚠️  Line doesn't match ID:payload format, trying fallback parsing",
                )
                // Handle SSE format or other content as fallback
                const trimmedLine = line.trim()
                console.log(
                  "🔄 Trying SSE format, trimmed line:",
                  trimmedLine.substring(0, 100),
                )

                if (trimmedLine.startsWith("data: ")) {
                  const data = trimmedLine.slice(6)
                  if (data === "[DONE]" || data === "") continue

                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.content && typeof parsed.content === "string") {
                      console.log(
                        "✅ SSE content found:",
                        parsed.content.substring(0, 50),
                      )
                      assistantMessage += parsed.content

                      // Mark that we've received assistant response
                      if (!hasAssistantResponse) {
                        setHasAssistantResponse(true)
                      }

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
                  console.log(
                    "📝 Treating as plain text content:",
                    trimmedLine.substring(0, 50),
                  )
                  // Treat as plain text content
                  assistantMessage += trimmedLine + "\n"

                  // Mark that we've received assistant response
                  if (!hasAssistantResponse) {
                    setHasAssistantResponse(true)
                  }

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
                } else {
                  console.log(
                    "❌ Line ignored, doesn't match any format:",
                    line.substring(0, 100),
                  )
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
          // Clear progress message when done
          setProgressMessage("")
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
          className={`fixed bottom-6 right-6 z-50 bg-guarumo-primary hover:bg-guarumo-secondary text-zinc-50 rounded-full p-4 shadow-lg transition-all duration-300 min-w-[44px] min-h-[44px] ${
            isOpen ? "scale-0" : "scale-100"
          }`}
          aria-hidden={isOpen}
          tabIndex={isOpen ? -1 : 0}
          aria-label={t("openChat", { defaultValue: "Open chat" })}
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
              progressMessage={progressMessage}
              hasAssistantResponse={hasAssistantResponse}
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
          progressMessage={progressMessage}
          hasAssistantResponse={hasAssistantResponse}
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

  // Embedded variant - collapsible
  return (
    <div
      className={`flex flex-col bg-zinc-50 rounded-lg ${className} ${
        isEmbeddedCollapsed ? "h-auto" : "h-[300px] sm:h-[400px]"
      }`}
    >
      <ChatHeader
        onToggleCollapse={() => setIsEmbeddedCollapsed(!isEmbeddedCollapsed)}
        isCollapsed={isEmbeddedCollapsed}
      />
      {!isEmbeddedCollapsed && (
        <>
          <ChatBody
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
            variant="embedded"
            progressMessage={progressMessage}
            hasAssistantResponse={hasAssistantResponse}
          />
          <ChatFooter
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  )
}

function ChatHeader({
  onClose,
  onToggleCollapse,
  isCollapsed,
}: {
  onClose?: () => void
  onToggleCollapse?: () => void
  isCollapsed?: boolean
}) {
  const t = useTranslations("bookingChat")
  return (
    <div className="flex items-center justify-between p-4 border-b bg-guarumo-primary text-zinc-50 rounded-t-lg">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">
          {t("title", { defaultValue: "Booking Assistant" })}
        </h3>
      </div>
      <div className="flex items-center gap-1">
        {onToggleCollapse && (
          <Button
            variant="ghost"
            onClick={onToggleCollapse}
            className="p-1"
            aria-label={
              isCollapsed
                ? t("expandChat", { defaultValue: "Expand chat" })
                : t("collapseChat", { defaultValue: "Collapse chat" })
            }
          >
            {isCollapsed ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-1"
            aria-label={t("closeChat", { defaultValue: "Close chat" })}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Utility function to sanitize user input while preserving readable characters
function sanitizeUserInput(content: string): string {
  // Only escape characters that could break HTML if rendered as HTML
  // Since we're displaying as plain text, we can be more conservative
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&/g, "&amp;")
}

function ChatBody({
  messages,
  isLoading,
  messagesEndRef,
  variant,
  progressMessage,
  hasAssistantResponse,
}: {
  messages: Message[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  variant?: "floating" | "sidebar" | "embedded"
  progressMessage?: string
  hasAssistantResponse?: boolean
}) {
  return (
    <div
      className={`${
        variant === "embedded" ? "min-h-0 h-0" : ""
      } flex-1 overflow-y-scroll p-4 space-y-4 flex flex-col`}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.role === "user"
                ? "bg-guarumo-primary text-zinc-50"
                : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1">
                <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
              </div>
            ) : (
              // Sanitize user input for display to prevent XSS
              sanitizeUserInput(msg.content)
            )}
          </div>
        </div>
      ))}
      {progressMessage && (
        <div className="flex justify-start">
          <div className="bg-blue-50 border border-guarumo-primary/80 rounded-2xl px-4 py-2 text-guarumo-primary/80 text-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progressMessage}
            </div>
          </div>
        </div>
      )}
      {isLoading && !progressMessage && !hasAssistantResponse && (
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
  const [error, setError] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (
        input.trim() &&
        !isLoading &&
        input.length <= INPUT_LIMITS.CHAT_MESSAGE
      ) {
        onSubmit(e as any)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value

    // Enforce length limit
    if (newValue.length > INPUT_LIMITS.CHAT_MESSAGE) {
      setError(`Message cannot exceed ${INPUT_LIMITS.CHAT_MESSAGE} characters`)
      return
    }

    // Clear error if within limits
    if (error) {
      setError("")
    }

    setInput(newValue)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate input before submission
    if (!input.trim()) {
      setError("Please enter a message")
      return
    }

    if (input.length > INPUT_LIMITS.CHAT_MESSAGE) {
      setError(`Message cannot exceed ${INPUT_LIMITS.CHAT_MESSAGE} characters`)
      return
    }

    // Basic sanitization check for malicious patterns
    const maliciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
    ]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(input)) {
        setError("Message contains invalid content")
        return
      }
    }

    setError("")
    onSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-2 w-full items-end">
        <div className="flex-1">
          <Textarea
            id="chat-user-input"
            required={false}
            errorMessage={error}
            value={input}
            onChangeHandler={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder", {
              defaultValue: "Ask about booking...",
            })}
            disabled={isLoading}
            className="flex-1"
            maxLength={INPUT_LIMITS.CHAT_MESSAGE}
          />
          <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
            <span className={error ? "text-destructive" : ""}>
              {error ||
                `${input.length}/${INPUT_LIMITS.CHAT_MESSAGE} characters`}
            </span>
          </div>
        </div>
        <div>
          <Button
            type="submit"
            variant="secondary"
            disabled={
              isLoading ||
              !input.trim() ||
              input.length > INPUT_LIMITS.CHAT_MESSAGE ||
              !!error
            }
            className="mb-2 flex items-center gap-1"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="text-xs opacity-60 hidden sm:inline">
                  {t("sendButton", { defaultValue: "Send" })}
                </span>
              </>
            )}
          </Button>
          <span className="hidden sm:block text-xs text-muted-foreground">
            {t("keyboardShortcut", {
              defaultValue: "{shortcut}+Enter to send",
              shortcut: navigator.platform.includes("Mac") ? "⌘" : "Ctrl",
            })}
          </span>
        </div>
      </div>
    </form>
  )
}
