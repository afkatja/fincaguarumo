import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"
import { verifyAdminAuth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Verify the request is from an authenticated admin
    await verifyAdminAuth(request)

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
    const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Let the custom trigger send confirmation email
      user_metadata: data || {},
    })

    if (error) {
      console.error("[auth:admin-create-user] createUser failed:", error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 400 },
      )
    }

    // If emailRedirectTo is provided, generate a confirmation link manually
    // and send it via the custom endpoint (optional - trigger handles it)
    if (emailRedirectTo && userData.user) {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
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
      message: "User created successfully. Confirmation email will be sent via custom SMTP.",
    })
  } catch (error: any) {
    console.error("[auth:admin-create-user] unexpected error:", error)
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}