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
const RATE_LIMIT_MAX_REQUESTS = 20

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

function sanitizeInput(input: string): string {
  // Basic XSS prevention
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      )
    }

    const body: ChatRequest = await request.json()
    const { messages, threadId, locale = "en", context } = body

    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      )
    }

    // Get the last user message for processing
    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage?.content || ""

    if (
      !userQuery ||
      typeof userQuery !== "string" ||
      userQuery.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Valid message content is required" },
        { status: 400 },
      )
    }

    // Sanitize input
    const sanitizedQuery = sanitizeInput(userQuery.trim())

    // Detect intent
    const userIntent: UserIntent = detectUserIntent(sanitizedQuery)
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

    // Return streaming response immediately
    const streamResponse = new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })

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

    return streamResponse
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
