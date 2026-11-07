import { NextResponse } from "next/server"
import {
  checkAvailabilityRange,
  fetchUnavailableRanges,
  convertRangesToBlockedDates,
} from "@/lib/availability"

/**
 * GET: Fetch unavailable blocked dates and ranges for customer calendar
 * Fast single Supabase query; no sync trigger on read (cron handles sync).
 */
export async function GET() {
  try {
    const ranges = await fetchUnavailableRanges()
    const blockedDates = convertRangesToBlockedDates(ranges)

    return NextResponse.json({
      blockedDates,
      ranges,
      unavailableRanges: ranges,
    })
  } catch (error) {
    console.error("Error fetching availability:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * POST: Check if a date range is available for checkout
 * Request body: { checkIn: string, checkOut: string }
 */
export async function POST(request: Request) {
  try {
    const { checkIn, checkOut } = await request.json()

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "checkIn and checkOut are required" },
        { status: 400 },
      )
    }

    const availabilityResult = await checkAvailabilityRange(checkIn, checkOut)
    return NextResponse.json(availabilityResult)
  } catch (error) {
    console.error("Error in availability check:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
