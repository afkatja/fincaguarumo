import { NextResponse } from "next/server"
import {
  verifyAdminAuth,
  AuthUser,
  createSupabaseAdmin,
} from "../../../lib/auth"
import {
  checkAvailabilityRange,
  triggeriCalSync,
  updateAvailabilityTable,
  fetchUnavailableRanges,
} from "../../../lib/availability"

/**
 * POST: Check if a date range is available
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

    // Sync with the merged iCal endpoint (handled by global cooldown)
    try {
      await triggeriCalSync(request)
    } catch (syncError) {
      console.warn("Error syncing bookings (continuing anyway):", syncError)
      // Continue anyway - we'll check what we have
    }

    // Check if the requested date range is available using shared utility
    const availabilityResult = await checkAvailabilityRange(checkIn, checkOut)
    console.log("Availability check result:", availabilityResult)

    return NextResponse.json(availabilityResult)
  } catch (error) {
    console.error("Error in availability check on supabase:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * GET: Fetch all unavailable date ranges
 */
export async function GET() {
  try {
    const { availabilityData } = await fetchUnavailableRanges()

    return NextResponse.json({ unavailableRanges: availabilityData })
  } catch (error) {
    console.error("Error fetching availability:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * PUT: Update availability (mark dates as unavailable/booked)
 * Request body: { startDate: string, endDate: string, isAvailable: boolean, reason?: string, bookingUid?: string }
 */
export async function PUT(request: Request) {
  try {
    // Verify admin authentication
    let authUser: AuthUser
    try {
      authUser = await verifyAdminAuth(request)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 },
      )
    }

    const { startDate, endDate, isAvailable, reason, bookingUid } =
      await request.json()

    if (!startDate || !endDate || isAvailable === undefined) {
      return NextResponse.json(
        { error: "startDate, endDate, and isAvailable are required" },
        { status: 400 },
      )
    }

    const result = await updateAvailabilityTable(
      startDate,
      endDate,
      isAvailable,
      reason,
      bookingUid,
    )
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error updating availability from supabase:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * DELETE: Remove availability entries (for admin use)
 */
export async function DELETE(request: Request) {
  try {
    // Verify admin authentication
    let authUser: AuthUser
    try {
      authUser = await verifyAdminAuth(request)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from("availability")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting availability entry:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting availability entry:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
