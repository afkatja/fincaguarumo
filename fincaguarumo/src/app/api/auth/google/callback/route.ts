import { NextRequest, NextResponse } from "next/server"
import { getTokensFromCode, setOAuth2Credentials, listAccounts, listInvitations } from "@/lib/gbp/client"

export const revalidate = 0

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/admin/gbp-setup?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/gbp-setup?error=no_code", request.url))
  }

  try {
    const tokens = await getTokensFromCode(code)
    setOAuth2Credentials(tokens.access_token!, tokens.refresh_token!, tokens.expiry_date!)

    // Verify we can access the human owner's accounts
    await listAccounts(false) // useServiceAccount = false
    await listInvitations(false)

    // Store tokens in session/cookies for subsequent requests
    const response = NextResponse.redirect(new URL("/admin/gbp-setup?success=1", request.url))
    
    // Set httpOnly cookies for the OAuth tokens
    response.cookies.set("gbp_access_token", tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    response.cookies.set("gbp_refresh_token", tokens.refresh_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
    response.cookies.set("gbp_expiry", String(tokens.expiry_date), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    })

    return response
  } catch (err) {
    console.error("OAuth callback error:", err)
    return NextResponse.redirect(new URL(`/admin/gbp-setup?error=${encodeURIComponent(String(err))}`, request.url))
  }
}