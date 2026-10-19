import { NextRequest, NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gbp/client"

export const revalidate = 0

/**
 * Generates a cryptographically secure random state parameter for OAuth 2.0.
 * 
 * Used to prevent CSRF attacks during the OAuth authorization flow.
 * Generates 32 random bytes (256 bits) encoded as hex.
 * 
 * @returns A 64-character hexadecimal string suitable for OAuth state parameter
 */
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Initiates the Google OAuth 2.0 authorization flow for GBP access.
 * 
 * Generates a secure random state parameter, stores it in an httpOnly cookie,
 * and redirects the user to Google's OAuth consent screen.
 * 
 * The state parameter is validated in the callback to prevent CSRF attacks.
 * 
 * @param request - The incoming NextRequest
 * @returns A redirect response to Google's OAuth consent screen with state cookie
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const state = generateState()
  const url = getAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/api/auth/google/callback",
  })

  return response
}