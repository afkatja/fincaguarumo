import { NextRequest, NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gbp/client"

export const revalidate = 0

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") || "setup"
  const url = getAuthUrl(state)
  return NextResponse.redirect(url)
}