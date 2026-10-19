import { NextRequest, NextResponse } from "next/server"
import { getTokensFromCode, createAuthenticatedOAuth2Client, listAccounts, listInvitations } from "@/lib/gbp/client"

export const revalidate = 0

/**
 * Handles the OAuth 2.0 callback from Google after user authorization.
 * 
 * This endpoint:
 * 1. Validates the OAuth state parameter to prevent CSRF attacks
 * 2. Exchanges the authorization code for access/refresh tokens
 * 3. Creates an authenticated OAuth2 client with the tokens
 * 4. Verifies the user has access to GBP accounts/locations
 * 5. Stores tokens in httpOnly cookies for subsequent requests
 * 
 * @param request - The incoming NextRequest containing OAuth callback parameters
 * @returns A redirect response to the admin setup page with success/error status
 * @throws Redirects to error page on validation failure or token exchange error
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")
  const returnedState = request.nextUrl.searchParams.get("state")
  const storedState = request.cookies.get("oauth_state")?.value

  if (error) {
    return NextResponse.redirect(new URL(`/admin/gbp-setup?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/gbp-setup?error=no_code", request.url))
  }

  if (!storedState || !returnedState || storedState !== returnedState) {
    return NextResponse.redirect(new URL("/admin/gbp-setup?error=invalid_state", request.url))
  }

  try {
    const tokens = await getTokensFromCode(code)
    const oauth2Client = createAuthenticatedOAuth2Client(
      tokens.access_token!,
      tokens.refresh_token!,
      tokens.expiry_date!,
    )

    // Verify we can access the human owner's accounts
    await listAccounts(false, oauth2Client)
    await listInvitations(false, oauth2Client)

    // Store tokens in session/cookies for subsequent requests
    const response = NextResponse.redirect(new URL("/admin/gbp-setup?success=1", request.url))
    
    // Clear the oauth_state cookie after successful validation
    response.cookies.delete("oauth_state")
    
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