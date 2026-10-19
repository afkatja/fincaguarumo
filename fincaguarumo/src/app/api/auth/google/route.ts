import { NextRequest, NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gbp/client"

export const revalidate = 0

function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("")
}

export async function GET(request: NextRequest) {
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