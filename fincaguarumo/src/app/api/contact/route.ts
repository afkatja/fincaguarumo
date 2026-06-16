import { NextResponse, NextRequest } from "next/server"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"
import { validateContactForm } from "@/lib/input-validation"
import { contactRateLimiter } from "@/lib/rate-limiting/redis-rate-limit"

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
})

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")

  // Only trust headers when running behind a trusted proxy
  const isTrustedProxy =
    process.env.VERCEL === "1" ||
    process.env.NETLIFY === "true" ||
    process.env.TRUSTED_PROXY === "true"

  if (isTrustedProxy && forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (isTrustedProxy && real) {
    return real
  }

  // Return unique request ID when not behind trusted proxy
  // Check for existing request ID header first
  const requestId = request.headers.get("x-request-id")
  if (requestId) {
    return requestId
  }

  // Generate a unique request ID if none exists
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function checkRateLimit(
  identifier: string | null,
): Promise<{ allowed: boolean; resetTime: number }> {
  // Skip rate limiting if no valid identifier (e.g., not behind trusted proxy)
  if (!identifier || identifier.startsWith("req_")) {
    console.log("Skipping rate limiting - no valid IP identifier")
    return {
      allowed: true,
      resetTime: Date.now() + 60000,
    }
  }

  try {
    const result = await contactRateLimiter.checkLimit(identifier)
    return {
      allowed: result.allowed,
      resetTime: result.resetTime,
    }
  } catch (error) {
    console.error("Rate limiting error:", error)
    // Fail open: allow request if rate limiting fails
    return {
      allowed: true,
      resetTime: Date.now() + 60000,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting with Redis-based distributed rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(clientIP)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000,
            ).toString(),
          },
        },
      )
    }

    // Parse JSON body with proper error handling
    let name, email, message
    try {
      const body = await request.json()
      ;({ name, email, message } = body)
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 },
        )
      }
      throw parseError // Re-throw other unexpected errors
    }

    // Validate and sanitize input
    const validation = validateContactForm({ name, email, message })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validation.error,
        },
        { status: 400 },
      )
    }

    const sanitizedData = validation.sanitizedValue!

    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL!,
      "Finca Guarumo Contact Form",
    )
    const recipient = new Recipient(process.env.CONTACT_EMAIL!, "Finca Guarumo")

    // Create safe HTML content with sanitized data
    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${sanitizedData.name}</p>
      <p><strong>Email:</strong> ${sanitizedData.email}</p>
      <p><strong>Message:</strong></p>
      <p>${sanitizedData.message}</p>
    `

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo([recipient])
      .setReplyTo(new Recipient(sanitizedData.email, sanitizedData.name))
      .setSubject("New Contact Form Submission")
      .setHtml(htmlContent)

    await mailerSend.email.send(emailParams)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending email:", (error as Error)?.message)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    )
  }
}
