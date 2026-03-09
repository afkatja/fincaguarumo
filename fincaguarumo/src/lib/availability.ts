import { createClient } from "@supabase/supabase-js"
import { createSupabaseAdmin } from "../lib/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = createSupabaseAdmin()

export interface AvailabilityRange {
  start_date: string
  end_date: string
  is_available: boolean
  reason?: string
  booking_uid?: string
}

export interface BookingRange {
  check_in: string
  check_out: string
}

export interface AvailabilityCheckResult {
  isAvailable: boolean
  conflictingRanges: AvailabilityRange[]
  bookingConflicts: BookingRange[]
}

/**
 * Fetch all unavailable ranges from both availability and bookings tables
 */
export async function fetchUnavailableRanges(): Promise<{
  availabilityData: AvailabilityRange[] | null
  bookingsData: BookingRange[] | null
}> {
  try {
    // Fetch from availability table
    const { data: availabilityData, error: availabilityError } = await supabase
      .from("availability")
      .select("*")
      .eq("is_available", false)
      .order("start_date", { ascending: true })

    if (availabilityError) {
      console.error("Error fetching availability data:", availabilityError)
      throw availabilityError
    }

    // Fetch from bookings table as fallback
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("check_in, check_out")
      .order("check_in", { ascending: true })

    if (bookingsError) {
      console.error("Error fetching bookings data:", bookingsError)
      throw bookingsError
    }

    return {
      availabilityData: availabilityData || null,
      bookingsData: bookingsData || null,
    }
  } catch (error) {
    console.error("Error fetching unavailable ranges:", error)
    throw error
  }
}

/**
 * Check if a date range is available
 */
export async function checkAvailabilityRange(
  checkIn: string,
  checkOut: string,
): Promise<AvailabilityCheckResult> {
  try {
    const { availabilityData, bookingsData } = await fetchUnavailableRanges()

    // Filter availability data for overlapping ranges
    const conflictingRanges =
      availabilityData?.filter(
        range => range.start_date <= checkOut && range.end_date >= checkIn,
      ) || []

    // Filter bookings data for overlapping ranges
    const bookingConflicts =
      bookingsData?.filter(
        booking => booking.check_in <= checkOut && booking.check_out >= checkIn,
      ) || []

    const isUnavailable = conflictingRanges.length > 0
    const hasBookingConflict = bookingConflicts.length > 0
    const isAvailable = !isUnavailable && !hasBookingConflict

    return {
      isAvailable,
      conflictingRanges,
      bookingConflicts,
    }
  } catch (error) {
    console.error("Error checking availability range:", error)
    throw error
  }
}

/**
 * Convert date ranges to individual blocked dates array
 */
export function convertRangesToBlockedDates(
  availabilityData: AvailabilityRange[] | null,
  bookingsData: BookingRange[] | null,
): Date[] {
  const blockedDates: Date[] = []

  // Process availability table data
  if (availabilityData) {
    for (const range of availabilityData) {
      const start = new Date(range.start_date)
      const end = new Date(range.end_date)

      // Add all dates in the range to blocked dates
      const currentDate = new Date(start)
      while (currentDate < end) {
        blockedDates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
  }

  // Process bookings table data as fallback
  if (bookingsData) {
    for (const booking of bookingsData) {
      const start = new Date(booking.check_in)
      const end = new Date(booking.check_out)

      // Add all dates in the range to blocked dates
      const currentDate = new Date(start)
      while (currentDate < end) {
        // Check if date is already in blockedDates to avoid duplicates
        const dateStr = currentDate.toISOString().split("T")[0]
        if (
          !blockedDates.some(
            date => date.toISOString().split("T")[0] === dateStr,
          )
        ) {
          blockedDates.push(new Date(currentDate))
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
  }

  // Sort blocked dates
  blockedDates.sort((a, b) => a.getTime() - b.getTime())

  return blockedDates
}

// Global sync cooldown to prevent multiple syncs across all endpoints
const lastSyncTime = { timestamp: 0 }
const SYNC_COOLDOWN = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Trigger iCal sync with proper error handling and global cooldown
 */
export async function triggeriCalSync(request?: Request): Promise<void> {
  const now = Date.now()

  // Check global cooldown
  if (now - lastSyncTime.timestamp < SYNC_COOLDOWN) {
    console.log(
      "Skipping sync - using cached data (last sync:",
      new Date(lastSyncTime.timestamp).toISOString(),
      ")",
    )
    return
  }

  try {
    // Determine site URL based on environment and request
    let siteUrl: string

    if (process.env.NODE_ENV === "production" && request) {
      const requestUrl = new URL(request.url)
      siteUrl = `${requestUrl.protocol}//${requestUrl.host}`
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    } else if (process.env.VERCEL_URL) {
      siteUrl = `https://${process.env.VERCEL_URL}`
    } else {
      siteUrl = "http://localhost:3000"
    }

    const syncResponse = await fetch(`${siteUrl}/api/ical/merged`, {
      method: "GET",
    })

    if (!syncResponse.ok) {
      console.warn(
        `Sync endpoint returned ${syncResponse.status}: ${syncResponse.statusText}`,
      )
      return
    }

    console.log("Bookings sync completed successfully")
    lastSyncTime.timestamp = now // Update last sync time only on success
  } catch (syncError) {
    console.warn("Error syncing bookings:", syncError)
    throw syncError
  }
}

/**
 * Update availability table with new range
 */
export async function updateAvailabilityTable(
  startDate: string,
  endDate: string,
  isAvailable: boolean,
  reason?: string,
  bookingUid?: string,
) {
  try {
    // Check if this range already exists
    const { data: existing } = await supabaseAdmin
      .from("availability")
      .select("id")
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .maybeSingle()

    // Build update/insert data
    const availabilityData: any = {
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    }

    if (reason !== undefined) {
      availabilityData.reason = reason
    }
    if (bookingUid !== undefined) {
      availabilityData.booking_uid = bookingUid
    }

    let result

    if (existing) {
      // Update existing entry
      const { data, error } = await supabaseAdmin
        .from("availability")
        .update(availabilityData)
        .eq("id", existing.id)
        .select()

      if (error) {
        throw error
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

      if (reason !== undefined) {
        insertData.reason = reason
      }
      if (bookingUid !== undefined) {
        insertData.booking_uid = bookingUid
      }

      const { data, error } = await supabaseAdmin
        .from("availability")
        .insert(insertData)
        .select()

      if (error) {
        throw error
      }
      result = data
    }

    return result
  } catch (error) {
    console.error("Error updating availability table:", error)
    throw error
  }
}
