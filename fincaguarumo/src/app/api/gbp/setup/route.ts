import { NextRequest, NextResponse } from "next/server"
import { listAccounts, listInvitations, acceptInvitation, fetchLocations, setOAuth2Credentials } from "@/lib/gbp/client"

export const revalidate = 0

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

    setOAuth2Credentials(accessToken, refreshToken, parseInt(expiry))

    const accounts = await listAccounts(false)
    const invitations = await listInvitations(false)
    const locations = await fetchLocations(false)

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

    setOAuth2Credentials(accessToken, refreshToken, parseInt(expiry))

    if (action === "accept_invitation" && invitationName) {
      await acceptInvitation(invitationName, false)
      const locations = await fetchLocations(false)
      return NextResponse.json({ success: true, locations })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("GBP setup action error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}