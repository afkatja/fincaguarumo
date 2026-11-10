import { NextResponse } from "next/server"
import { runIcalSync } from "@/lib/ical-sync"

const CRON_SECRET = process.env.CALENDAR_SYNC_SECRET

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function validateCronSecret(providedSecret: string | null): boolean {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET environment variable is not set")
    return false
  }
  if (!providedSecret) {
    console.error("No secret provided in request")
    return false
  }
  return constantTimeCompare(providedSecret, CRON_SECRET)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const providedSecret = request.headers.get("x-calendar-sync-secret") || searchParams.get("secret")

    if (!validateCronSecret(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const forceSync = searchParams.get("force") === "true"
    const { bookings, merged } = await runIcalSync(forceSync)

    return NextResponse.json({ bookings, merged })
  } catch (err) {
    console.error("API error merging bookings:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
