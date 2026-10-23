import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"

// Simple in-memory rate limiting (for edge functions)
// In production, consider using a Redis-based solution
export const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5 // 5 requests per minute per IP

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

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      )
    }

    // Authentication via shared secret (similar to custom-send-confirmation)
    const headerSecret = request.headers.get("x-admin-signup-secret")
    const sharedSecret = process.env.ADMIN_SIGNUP_SECRET || ""

    if (!sharedSecret) {
      console.error(
        "[auth:admin-create-user] ADMIN_SIGNUP_SECRET env var is empty",
      )
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      )
    }

    if (!headerSecret || headerSecret !== sharedSecret) {
      console.warn("[auth:admin-create-user] authentication failed", { ip })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, emailRedirectTo, data } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Create user via admin API - bypasses public rate limits
    // The custom SMTP trigger (migration 016) will still fire AFTER INSERT on auth.users
    const { data: userData, error } = await supabaseAdmin.auth.admin.createUser(
      {
        email,
        password,
        email_confirm: false, // Let the custom trigger send confirmation email
        user_metadata: data || {},
      },
    )

    if (error) {
      console.error("[auth:admin-create-user] createUser failed:", error)

      // Handle specific error cases with user-friendly messages
      if (
        error.message?.includes("already been registered") ||
        error.message?.includes("already exists")
      ) {
        return NextResponse.json(
          {
            error: "A user with this email address has already been registered",
          },
          { status: 409 }, // 409 Conflict
        )
      }

      return NextResponse.json(
        { error: error.message || "Failed to create user" },
        { status: error.status || 400 },
      )
    }

    // If emailRedirectTo is provided, generate a confirmation link manually
    // and send it via the custom endpoint (optional - trigger handles it)
    if (emailRedirectTo && userData.user) {
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "signup",
          email,
          password,
          options: {
            redirectTo: emailRedirectTo,
          },
        })

      if (linkError) {
        console.warn("[auth:admin-create-user] generateLink failed:", linkError)
      } else if (linkData?.properties?.action_link) {
        // The trigger will send the email with this action_link
        // We could also call the custom endpoint directly here if needed
        console.info("[auth:admin-create-user] confirmation link generated")
      }
    }

    return NextResponse.json({
      user: userData.user,
      message:
        "User created successfully. Confirmation email will be sent via custom SMTP.",
    })
  } catch (error: unknown) {
    console.error("[auth:admin-create-user] unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
