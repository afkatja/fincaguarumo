import { NextResponse } from "next/server"
import {
  checkAvailabilityRange,
  fetchUnavailableRanges,
  convertRangesToBlockedDates,
  convertRangesToCheckoutBlockedDates,
} from "@/lib/availability"

/**
 * GET: Fetch unavailable blocked dates and ranges for customer calendar
 * Fast single Supabase query; no sync trigger on read (cron handles sync).
 */
export async function GET() {
  try {
    const ranges = await fetchUnavailableRanges()
    const blockedDates = convertRangesToBlockedDates(ranges)
    const checkoutBlockedDates = convertRangesToCheckoutBlockedDates(ranges)

    return NextResponse.json({
      blockedDates,
      checkoutBlockedDates,
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
    const body = await request.json()
    const { checkIn, checkOut } = body

    if (
      typeof checkIn !== "string" ||
      typeof checkOut !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)
    ) {
      return NextResponse.json(
        { error: "checkIn and checkOut must be valid YYYY-MM-DD dates" },
        { status: 400 },
      )
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    if (
      Number.isNaN(checkInDate.getTime()) ||
      Number.isNaN(checkOutDate.getTime())
    ) {
      return NextResponse.json(
        { error: "checkIn and checkOut must be valid calendar dates" },
        { status: 400 },
      )
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: "checkOut must be strictly after checkIn" },
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
