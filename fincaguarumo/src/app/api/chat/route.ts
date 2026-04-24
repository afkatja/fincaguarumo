import { NextRequest, NextResponse } from "next/server"
import {
  detectUserIntent,
  getProgressMessage,
  UserIntent,
} from "../../../lib/intent-detection"
import { streamResponseWithData } from "./streamResponse"
import { ChatMessage } from "../../../types"
import { ChatContext as ContextAwareChatContext } from "../../../lib/better-chatbot/context-aware"
import {
  validateChatMessage,
  validateInput,
  INPUT_LIMITS,
} from "../../../lib/input-validation"

interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  threadId?: string
  locale?: string
  context?: {
    page?: string
    propertySlug?: string
    bookingState?: any
  }
}

// Rate limiting (simple in-memory for demo)
// TODO: For production/global limits, consider using shared bounded store:
// - Redis with TTL for distributed rate limiting
// - Upstash Redis for serverless environments
// - Netlify KV for edge deployments
// - Cloudflare KV for edge-first applications
const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number; lastAccess: number }
>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Increased for tests
const RATE_LIMIT_MAX_ENTRIES = 10000 // Hard cap on rate limit entries

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")

  // Only trust x-forwarded-for when running behind a trusted proxy
  const isTrustedProxy =
    process.env.VERCEL === "1" ||
    process.env.NETLIFY === "true" ||
    process.env.TRUSTED_PROXY === "true"

  if (isTrustedProxy && forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    return forwarded.split(",")[0].trim()
  }

  // Fall back to x-real-ip or unknown
  return real || "unknown"
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Prune expired entries
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }

  // Enforce hard cap on rateLimitMap size
  if (rateLimitMap.size >= RATE_LIMIT_MAX_ENTRIES) {
    // Evict oldest entries (by lastAccess time)
    const entries = Array.from(rateLimitMap.entries()).sort(
      ([, a], [, b]) => a.lastAccess - b.lastAccess,
    )

    const toEvict = entries.slice(0, Math.floor(RATE_LIMIT_MAX_ENTRIES * 0.1)) // Evict 10%
    toEvict.forEach(([key]) => rateLimitMap.delete(key))
  }

  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
      lastAccess: now,
    })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  record.lastAccess = now
  return true
}

// Helper function to create error responses
function createErrorResponse(error: string, status: number): NextResponse {
  const response = NextResponse.json({ error }, { status })

  // Add Content Security Policy headers for XSS protection
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  )
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

// Helper function to create successful responses with security headers
function createSuccessResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status })

  // Add Content Security Policy headers for XSS protection
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  )
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

// Helper function to validate chat request with strict input validation
function validateChatRequest(body: ChatRequest): {
  isValid: boolean
  error?: string
  rawQuery?: string
  sanitizedMessages?: ChatMessage[]
} {
  const { messages, threadId, locale } = body

  // Validate messages array
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Messages array is required" }
  }

  // Validate thread ID if provided
  if (threadId) {
    const threadIdValidation = validateInput(
      threadId,
      INPUT_LIMITS.CHAT_THREAD_ID,
      {
        fieldName: "threadId",
        required: false,
        sanitize: true,
      },
    )
    if (!threadIdValidation.isValid) {
      return { isValid: false, error: threadIdValidation.error }
    }
  }

  // Validate locale if provided
  if (locale) {
    const localeValidation = validateInput(locale, 10, {
      fieldName: "locale",
      required: false,
      sanitize: true,
    })
    if (!localeValidation.isValid) {
      return { isValid: false, error: localeValidation.error }
    }
  }

  // Validate each message
  const sanitizedMessages: ChatMessage[] = []
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // Validate message structure
    if (!message.role || !message.content) {
      return {
        isValid: false,
        error: `Message ${i + 1} is missing required fields`,
      }
    }

    // Validate message role
    const validRoles = ["user", "assistant", "system", "tool"]
    if (!validRoles.includes(message.role)) {
      return {
        isValid: false,
        error: `Message ${i + 1} has invalid role: ${message.role}`,
      }
    }

    // Validate message content
    const contentValidation = validateChatMessage(message.content)
    if (!contentValidation.isValid) {
      return {
        isValid: false,
        error: `Message ${i + 1}: ${contentValidation.error}`,
      }
    }

    sanitizedMessages.push({
      role: message.role as "user" | "assistant" | "system" | "tool",
      content: contentValidation.sanitizedValue!,
    })
  }

  // Get the last user message for processing
  const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]
  const userQuery = lastMessage?.content || ""

  if (!userQuery || userQuery.trim().length === 0) {
    return { isValid: false, error: "Valid message content is required" }
  }

  return {
    isValid: true,
    rawQuery: userQuery,
    sanitizedMessages,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return createErrorResponse(
        "Too many requests. Please try again later.",
        429,
      )
    }

    let body: ChatRequest
    try {
      body = await request.json()
    } catch (parseError) {
      return createErrorResponse("Invalid JSON in request body", 400)
    }
    const { messages, threadId, locale = "en", context } = body

    // Validate request
    const validation = validateChatRequest(body)
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, 400)
    }

    const rawQuery = validation.rawQuery!
    const sanitizedMessages = validation.sanitizedMessages!

    // For intent detection, use the original query (without apostrophe sanitization)
    const queryForIntentDetection = messages[messages.length - 1]?.content || ""

    // Detect intent
    const userIntent: UserIntent = detectUserIntent(queryForIntentDetection)
    console.log("Detected intent:", userIntent)

    // Create TransformStream and send progress immediately
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    // Helper function to send progress
    const sendProgress = async (message: string) => {
      const payload = JSON.stringify({ type: "progress", message })
      const progressChunk = `0:${payload}\n`
      await writer.write(new TextEncoder().encode(progressChunk))
    }

    // Send immediate progress based on detected intent
    const progressMessage = getProgressMessage(userIntent)
    sendProgress(progressMessage).catch(error => {
      console.error("Progress send error:", error)
    })

    // Create streaming response
    const createStreamResponse = () => {
      const response = new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })

      // Add security headers to streaming response
      response.headers.set(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      )
      response.headers.set("X-Content-Type-Options", "nosniff")
      response.headers.set("X-Frame-Options", "DENY")
      response.headers.set("X-XSS-Protection", "1; mode=block")
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

      return response
    }

    // Process chat in background
    streamResponseWithData({
      userQuery: rawQuery,
      context: context
        ? ({
            page: context.page || "homepage",
            locale,
            bookingData: context.bookingState,
            propertyTitle: context.propertySlug,
          } as ContextAwareChatContext)
        : undefined,
      locale,
      messages: sanitizedMessages,
      threadId,
      writer,
      userIntent,
    }).catch(error => {
      console.error(" Chat processing failed:", error)
      // Graceful error handling
      writer
        .write(
          new TextEncoder().encode(
            '0:{"type":"progress","message":"Sorry, something went wrong. Please try again."}\n',
          ),
        )
        .finally(() => writer.close().catch(() => {}))
    })

    return createStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
