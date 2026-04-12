import { NextResponse } from "next/server"
import {
  fetchUnavailableRanges,
  convertRangesToBlockedDates,
  triggeriCalSync,
} from "../../../../lib/availability"

/**
 * GET: Fetch unavailable dates for calendar display
 * This endpoint provides the same data that availability checking uses
 */
export async function GET() {
  try {
    // Trigger sync in the background, don't wait for it
    triggeriCalSync().catch(syncError => {
      console.error("Background sync failed:", syncError)
    })

    // Fetch unavailable ranges using shared utility
    const { availabilityData, bookingsData } = await fetchUnavailableRanges()

    // Convert to blocked dates format
    const blockedDates = convertRangesToBlockedDates(
      availabilityData,
      bookingsData,
    )

    // Return in the same format as the original iCal merged endpoint
    const mergedRanges =
      availabilityData?.map(range => ({
        start: range.start_date,
        end: range.end_date,
        blocked: [], // We'll populate this if needed
      })) || []

    return NextResponse.json({
      blockedDates: blockedDates.map(date => date.toISOString()),
      merged: mergedRanges,
      source: "availability-table",
    })
  } catch (error) {
    console.error("Error in calendar availability endpoint:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
