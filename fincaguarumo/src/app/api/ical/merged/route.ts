import { NextResponse } from "next/server"
import { runIcalSync } from "@/lib/ical-sync"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceSync = searchParams.get("force") === "true"

    const { bookings, merged } = await runIcalSync(forceSync)

    return NextResponse.json({ bookings, merged })
  } catch (err) {
    console.error("API error merging bookings:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
