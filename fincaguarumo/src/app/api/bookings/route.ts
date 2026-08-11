import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyAdminAuth, verifyUserAuth } from "@/lib/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Helper function to create authenticated Supabase client
function createAuthenticatedSupabaseClient(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header")
  }
  const token = authHeader.substring(7)
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * POST: Create a new booking
 * Also updates the availability table to mark dates as unavailable
 * Requires authentication and authorization
 */
export async function POST(request: Request) {
  try {
    // Verify user authentication
    const authUser = await verifyUserAuth(request)

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(request)

    const bookingData = await request.json()

    // Authorization: Users can only create bookings for themselves, admins can create for anyone
    if (!authUser.is_admin && bookingData.uid !== authUser.id) {
      const error = new Error("You can only create bookings for yourself")
      ;(error as any).status = 403
      throw error
    }

    // Insert booking data into Supabase with all required fields
    // Note: Using snake_case column names as they exist in the database
    const bookingRecord: any = {
      check_in: bookingData.checkIn,
      check_out: bookingData.checkOut,
      guest_name: bookingData.guestName,
      email: bookingData.email || null,
      phone: bookingData.phone || null,
      source: bookingData.source || "Direct",
      uid: bookingData.uid,
      guests: bookingData.guests || 1,
      booking_type: bookingData.bookingType || "villa",
      total_price: bookingData.totalPrice || 0,
      currency: bookingData.currency || "usd",
    }

    // Optional fields
    if (bookingData.summary !== undefined) {
      bookingRecord.summary = bookingData.summary
    }
    if (bookingData.description !== undefined) {
      bookingRecord.description = bookingData.description
    }
    // External reservation ID from booking platforms (booking.com, airbnb, etc.)
    if (bookingData.externalReservationId !== undefined) {
      bookingRecord.external_reservation_id = bookingData.externalReservationId
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert([bookingRecord])
      .select()

    if (error) {
      console.error("Error creating booking:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update availability table to mark these dates as unavailable
    try {
      const availabilityRecord: any = {
        start_date: bookingData.checkIn,
        end_date: bookingData.checkOut,
        is_available: false,
        updated_at: new Date().toISOString(),
      }

      // Add optional fields if they might exist
      if (bookingData.uid) {
        availabilityRecord.booking_uid = bookingData.uid
      }
      if (bookingData.guestName) {
        availabilityRecord.reason = `Booked via ${bookingData.source || "Direct"} - ${bookingData.guestName}`
      }

      const { error: availabilityError } = await supabase
        .from("availability")
        .insert([availabilityRecord])

      if (availabilityError) {
        // If upsert fails due to missing columns, log but don't fail
        console.error("Error updating availability:", availabilityError)
      } else {
        console.log("Availability updated for new booking")
      }
    } catch (availabilityError) {
      console.error("Error updating availability:", availabilityError)
      // Don't fail the request if availability update fails
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in POST /api/bookings:", error)

    // Handle authentication errors with proper status codes
    if (error.status) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * GET: Fetch all bookings
 * Supports filtering by date range, source, and ID
 * Requires admin authentication to prevent PII exposure
 */
export async function GET(request: Request) {
  try {
    // Verify admin authentication before accessing booking data
    await verifyAdminAuth(request)

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const source = searchParams.get("source")
    const limit = searchParams.get("limit")

    // If ID is provided, fetch single booking
    if (id) {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          uid,
          guest_name,
          check_in,
          check_out,
          guests,
          booking_type,
          total_price,
          currency,
          source,
          status,
          external_reservation_id,
          created_at,
          updated_at
        `)
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error fetching booking:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    // Only select non-sensitive fields to prevent PII exposure
    let query = supabase.from("bookings").select(`
      id,
      uid,
      check_in,
      check_out,
      guests,
      booking_type,
      total_price,
      currency,
      source,
      status,
      external_reservation_id,
      created_at,
      updated_at
    `)

    // Filter by date range if provided
    if (from) {
      query = query.gte("check_in", from)
    }
    if (to) {
      query = query.lte("check_out", to)
    }

    // Filter by source if provided
    if (source) {
      query = query.eq("source", source)
    }

    // Apply limit if provided
    if (limit) {
      const parsedLimit = parseInt(limit, 10)
      if (
        !Number.isNaN(parsedLimit) &&
        Number.isInteger(parsedLimit) &&
        parsedLimit > 0
      ) {
        query = query.limit(parsedLimit)
      } else {
        return NextResponse.json(
          { error: "Invalid 'limit' parameter. Must be a positive integer." },
          { status: 400 },
        )
      }
    }

    // Order by check_in date
    query = query.order("check_in", { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error("Error fetching bookings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in GET /api/bookings:", error)

    // Handle authentication errors with proper status codes
    if (error.status) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * PUT: Update an existing booking
 * Requires authentication and authorization
 */
export async function PUT(request: Request) {
  try {
    // Verify user authentication
    const authUser = await verifyUserAuth(request)

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(request)

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Booking id is required" },
        { status: 400 },
      )
    }

    // Get the existing booking to check ownership
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("uid")
      .eq("id", id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Authorization: Users can only update their own bookings, admins can update any
    if (!authUser.is_admin && existingBooking.uid !== authUser.id) {
      const error = new Error("You can only update your own bookings")
      ;(error as any).status = 403
      throw error
    }

    const updateRecord: any = {}
    if (updateData.checkIn) updateRecord.check_in = updateData.checkIn
    if (updateData.checkOut) updateRecord.check_out = updateData.checkOut
    if (updateData.guestName) updateRecord.guest_name = updateData.guestName
    if (updateData.email !== undefined) updateRecord.email = updateData.email
    if (updateData.phone !== undefined) updateRecord.phone = updateData.phone
    if (updateData.source) updateRecord.source = updateData.source
    if (updateData.guests) updateRecord.guests = updateData.guests
    if (updateData.bookingType)
      updateRecord.booking_type = updateData.bookingType
    if (updateData.totalPrice !== undefined)
      updateRecord.total_price = updateData.totalPrice
    if (updateData.currency) updateRecord.currency = updateData.currency
    if (updateData.summary !== undefined)
      updateRecord.summary = updateData.summary
    if (updateData.description !== undefined)
      updateRecord.description = updateData.description
    if (updateData.externalReservationId !== undefined)
      updateRecord.external_reservation_id = updateData.externalReservationId

    const { data, error } = await supabase
      .from("bookings")
      .update(updateRecord)
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error updating booking:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in PUT /api/bookings:", error)

    // Handle authentication errors with proper status codes
    if (error.status) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * PATCH: Admin-only booking refresh/sync
 * Allows admins to update booking fields from external sources (booking.com, airbnb, etc.)
 * Requires admin authentication
 */
export async function PATCH(request: Request) {
  try {
    // Verify admin authentication
    const authUser = await verifyAdminAuth(request)

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(request)

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Booking id is required" },
        { status: 400 },
      )
    }

    // Get the existing booking to verify it exists
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, external_reservation_id")
      .eq("id", id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const updateRecord: any = {
      updated_at: new Date().toISOString(),
    }

    // Fields that can be refreshed from external sources
    if (updateData.externalReservationId !== undefined)
      updateRecord.external_reservation_id = updateData.externalReservationId
    if (updateData.status !== undefined) updateRecord.status = updateData.status
    if (updateData.totalPrice !== undefined) updateRecord.total_price = updateData.totalPrice
    if (updateData.currency !== undefined) updateRecord.currency = updateData.currency
    if (updateData.checkIn !== undefined) updateRecord.check_in = updateData.checkIn
    if (updateData.checkOut !== undefined) updateRecord.check_out = updateData.checkOut
    if (updateData.guestName !== undefined) updateRecord.guest_name = updateData.guestName
    if (updateData.source !== undefined) updateRecord.source = updateData.source
    if (updateData.guests !== undefined) updateRecord.guests = updateData.guests
    if (updateData.bookingType !== undefined) updateRecord.booking_type = updateData.bookingType
    if (updateData.email !== undefined) updateRecord.email = updateData.email
    if (updateData.phone !== undefined) updateRecord.phone = updateData.phone
    if (updateData.summary !== undefined) updateRecord.summary = updateData.summary
    if (updateData.description !== undefined) updateRecord.description = updateData.description

    const { data, error } = await supabase
      .from("bookings")
      .update(updateRecord)
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error refreshing booking:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error in PATCH /api/bookings:", error)

    // Handle authentication errors with proper status codes
    if (error.status) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/**
 * DELETE: Delete a booking
 * Also removes the corresponding availability entry
 * Requires authentication and authorization
 */
export async function DELETE(request: Request) {
  try {
    // Verify user authentication
    const authUser = await verifyUserAuth(request)

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const uid = searchParams.get("uid")

    if (!id && !uid) {
      return NextResponse.json(
        { error: "Either id or uid is required" },
        { status: 400 },
      )
    }

    // First get the booking to find the uid and check ownership
    let bookingUid = uid
    if (id) {
      // Always fetch from database when id is provided, never trust incoming uid
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("uid")
        .eq("id", id)
        .single()

      if (fetchError || !booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 },
        )
      }

      bookingUid = booking.uid
    }

    // Authorization: Users can only delete their own bookings, admins can delete any
    if (!authUser.is_admin && bookingUid !== authUser.id) {
      const error = new Error("You can only delete your own bookings")
      ;(error as any).status = 403
      throw error
    }

    // Delete the booking
    let query = supabase.from("bookings").delete()
    if (id) {
      query = query.eq("id", id)
    } else if (uid) {
      query = query.eq("uid", uid)
    }

    const { error } = await query

    if (error) {
      console.error("Error deleting booking:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also delete the availability entry if we have the uid
    if (bookingUid) {
      try {
        await supabase
          .from("availability")
          .delete()
          .eq("booking_uid", bookingUid)
      } catch (availabilityError) {
        console.error("Error deleting availability:", availabilityError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/bookings:", error)

    // Handle authentication errors with proper status codes
    if (error.status) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
