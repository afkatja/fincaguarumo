import { NextRequest, NextResponse } from "next/server"
import {
  detectUserIntent,
  getProgressMessage,
  UserIntent,
} from "../../../lib/intent-detection"
import { streamResponseWithData } from "./streamResponse"

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
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Increased for tests

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || real || "unknown"
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
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

// Helper function to sanitize input (basic XSS prevention)
function sanitizeInput(input: string): string {
  return (
    input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      // Don't sanitize apostrophes for intent detection - will handle in display layer
      .replace(/\//g, "&#x2F;")
  )
}

// Helper function to sanitize input for display (includes apostrophes)
function sanitizeInputForDisplay(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

// Helper function to validate chat request
function validateChatRequest(body: ChatRequest): {
  isValid: boolean
  error?: string
  sanitizedQuery?: string
} {
  const { messages } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Messages array is required" }
  }

  const lastMessage = messages[messages.length - 1]
  const userQuery = lastMessage?.content || ""

  if (
    !userQuery ||
    typeof userQuery !== "string" ||
    userQuery.trim().length === 0
  ) {
    return { isValid: false, error: "Valid message content is required" }
  }

  return { isValid: true, sanitizedQuery: sanitizeInput(userQuery.trim()) }
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

    const body: ChatRequest = await request.json()
    const { messages, threadId, locale = "en", context } = body

    // Validate request
    const validation = validateChatRequest(body)
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, 400)
    }

    const sanitizedQuery = validation.sanitizedQuery!
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
      userQuery: sanitizedQuery,
      context,
      locale,
      messages,
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
