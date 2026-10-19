import { NextRequest, NextResponse } from "next/server"
import { listAccounts, listInvitations, acceptInvitation, fetchLocations, createAuthenticatedOAuth2Client } from "@/lib/gbp/client"

export const revalidate = 0

/**
 * Checks the GBP setup status and returns available accounts, invitations, and locations.
 * 
 * Restores OAuth2 credentials from httpOnly cookies and uses them to fetch
 * the user's GBP accounts, pending invitations, and accessible locations.
 * 
 * @param request - The incoming NextRequest with OAuth cookies
 * @returns JSON with authenticated status, accounts, invitations, and locations
 * @returns 401 if not authenticated, with authUrl for OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    // Try to restore OAuth2 credentials from cookies
    const accessToken = request.cookies.get("gbp_access_token")?.value
    const refreshToken = request.cookies.get("gbp_refresh_token")?.value
    const expiry = request.cookies.get("gbp_expiry")?.value

    if (!accessToken || !refreshToken || !expiry) {
      return NextResponse.json({
        authenticated: false,
        authUrl: "/api/auth/google",
      })
    }

    const oauth2Client = createAuthenticatedOAuth2Client(
      accessToken,
      refreshToken,
      parseInt(expiry),
    )

    const accounts = await listAccounts(false, oauth2Client)
    const invitations = await listInvitations(false, oauth2Client)
    const locations = await fetchLocations(false, oauth2Client)

    return NextResponse.json({
      authenticated: true,
      accounts,
      invitations,
      locations,
    })
  } catch (err) {
    console.error("GBP setup status error:", err)
    return NextResponse.json({
      authenticated: false,
      error: String(err),
      authUrl: "/api/auth/google",
    })
  }
}

/**
 * Performs GBP setup actions using authenticated OAuth2 client.
 * 
 * Currently supports accepting GBP location invitations.
 * Restores OAuth2 credentials from cookies and performs the requested action.
 * 
 * @param request - The incoming NextRequest with action and optional invitationName
 * @returns JSON with success status and updated locations (for accept_invitation)
 * @returns 401 if not authenticated, 400 for invalid action, 500 for server errors
 */
export async function POST(request: NextRequest) {
  try {
    const { action, invitationName } = await request.json()

    // Restore OAuth2 credentials
    const accessToken = request.cookies.get("gbp_access_token")?.value
    const refreshToken = request.cookies.get("gbp_refresh_token")?.value
    const expiry = request.cookies.get("gbp_expiry")?.value

    if (!accessToken || !refreshToken || !expiry) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const oauth2Client = createAuthenticatedOAuth2Client(
      accessToken,
      refreshToken,
      parseInt(expiry),
    )

    if (action === "accept_invitation" && invitationName) {
      await acceptInvitation(invitationName, false, oauth2Client)
      const locations = await fetchLocations(false, oauth2Client)
      return NextResponse.json({ success: true, locations })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("GBP setup action error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}