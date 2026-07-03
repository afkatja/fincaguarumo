import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const flagName = request.nextUrl.searchParams.get("flag")

  if (!flagName || !/^[A-Z0-9_]+$/.test(flagName)) {
    return NextResponse.json(
      { error: "A valid flag search parameter is required" },
      { status: 400 },
    )
  }

  return NextResponse.json({
    [flagName]: process.env[`NEXT_PUBLIC_${flagName}`] === "true",
  })
}
