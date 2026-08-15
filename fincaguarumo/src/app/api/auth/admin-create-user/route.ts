import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Note: This endpoint is used for admin signup, so it doesn't require admin authentication
    // The new user will be created and then can be granted admin status via separate process

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
  } catch (error: any) {
    console.error("[auth:admin-create-user] unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
