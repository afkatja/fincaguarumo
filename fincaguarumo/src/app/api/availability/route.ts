import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

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

    // First, sync with the merged iCal endpoint to get latest bookings
    try {
      // In production, use the same host as the current request
      // In development, use localhost
      let siteUrl: string

      if (process.env.NODE_ENV === "production") {
        // Get the current request URL to avoid self-calling issues
        const requestUrl = new URL(request.url)
        siteUrl = `${requestUrl.protocol}//${requestUrl.host}`
      } else {
        siteUrl = "https://localhost:3000"
      }


      const syncResponse = await fetch(`${siteUrl}/api/ical/merged`, {
        method: "GET",
      })

      // Only process if we got a successful response
      if (!syncResponse.ok) {
        console.warn(
          `Sync endpoint returned ${syncResponse.status}: ${syncResponse.statusText}`,
        )
      } else {
        console.log("Bookings sync completed successfully")
      }
    } catch (syncError) {
      console.warn("Error syncing bookings (continuing anyway):", syncError)
      // Continue anyway - we'll check what we have
    }

    // Fetch availability data from Supabase
    // Check for overlapping unavailable periods:
    // An overlap exists when: existing_start <= requested_end AND existing_end >= requested_start
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("is_available", false)
      .lte("start_date", checkOut)
      .gte("end_date", checkIn)

    if (error) {
      console.error("Error checking availability from supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also check the bookings table directly as a fallback
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("check_in, check_out")
      .lte("check_in", checkOut)
      .gte("check_out", checkIn)

    if (bookingsError) {
      console.error("Error checking bookings from supabase:", bookingsError)
    }

    // Check if the requested date range is available
    const isUnavailable = data && data.length > 0
    const hasBookingConflict = bookingsData && bookingsData.length > 0
    const isAvailable = !isUnavailable && !hasBookingConflict

    const responseData = {
      isAvailable,
      conflictingRanges: data || [],
      bookingConflicts: bookingsData || [],
    }

    console.log("Returning availability response:", responseData)
    return NextResponse.json(responseData)
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
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("is_available", false)
      .order("start_date", { ascending: true })

    if (error) {
      console.error("Error fetching availability from supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ unavailableRanges: data })
  } catch (error) {
    console.error("Error fetching availability from supabase:", error)
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
    const { startDate, endDate, isAvailable, reason, bookingUid } =
      await request.json()

    if (!startDate || !endDate || isAvailable === undefined) {
      return NextResponse.json(
        { error: "startDate, endDate, and isAvailable are required" },
        { status: 400 },
      )
    }

    // Check if this range already exists
    const { data: existing } = await supabase
      .from("availability")
      .select("id")
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .maybeSingle()

    let result

    // Build update/insert data with only fields that should exist
    const availabilityData: any = {
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    }

    // Add optional fields if provided (these may need migration to exist)
    if (reason !== undefined) {
      availabilityData.reason = reason
    }
    if (bookingUid !== undefined) {
      availabilityData.booking_uid = bookingUid
    }

    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from("availability")
        .update(availabilityData)
        .eq("id", existing.id)
        .select()

      if (error) {
        console.error("Error updating availability from supabase:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    } else {
      // Create new entry
      const insertData: any = {
        start_date: startDate,
        end_date: endDate,
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      }

      // Add optional fields
      if (reason !== undefined) {
        insertData.reason = reason
      }
      if (bookingUid !== undefined) {
        insertData.booking_uid = bookingUid
      }

      const { data, error } = await supabase
        .from("availability")
        .insert(insertData)
        .select()

      if (error) {
        console.error("Error creating availability entry from supabase:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    }

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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const { error } = await supabase.from("availability").delete().eq("id", id)

    if (error) {
      console.error("Error deleting availability entry from supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting availability entry from supabase:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
