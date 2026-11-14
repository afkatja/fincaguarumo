import { createSupabaseAdmin } from "../lib/auth"

const supabaseAdmin = createSupabaseAdmin()

export interface DateRange {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  booking_uid?: string
  reason?: string
}

// For backwards compatibility with any existing callers
export interface AvailabilityRange extends DateRange {
  start_date?: string
  end_date?: string
  is_available?: boolean
}

export interface AvailabilityCheckResult {
  isAvailable: boolean
  conflictingRanges: DateRange[]
  bookingConflicts: DateRange[]
}

/**
 * Fetch all unavailable ranges from bookings table (single source of truth)
 * Slices dates at DB boundary to return date-only ranges (YYYY-MM-DD).
 * Excludes test bookings and the 18-month "CLOSED - Not available" block.
 */
export async function fetchUnavailableRanges(): Promise<DateRange[]> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const pageSize = 1000
    let offset = 0
    const allBookings: Array<{
      uid: string | null
      check_in: string
      check_out: string
      source: string | null
      guest_name: string | null
      is_test: boolean | null
    }> = []

    for (;;) {
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .select("uid, check_in, check_out, source, guest_name, is_test")
        .gte("check_out", today)
        .not("is_test", "is", true)
        .neq("guest_name", "CLOSED - Not available")
        .order("check_in", { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        console.error("Error fetching bookings data:", error)
        throw error
      }

      const page = (data || []) as typeof allBookings[number][]
      allBookings.push(...page)
      if (page.length < pageSize) break
      offset += pageSize
    }

    const filtered = allBookings.filter(booking => {
      const guestName = (booking.guest_name || "").toLowerCase()
      return !guestName.includes("closed - not available")
    })

    const ranges: DateRange[] = filtered.map(booking => ({
      start: booking.check_in.slice(0, 10),
      end: booking.check_out.slice(0, 10),
      booking_uid: booking.uid ?? undefined,
      reason: booking.source
        ? `Booked via ${booking.source}`
        : `Booked via Direct - ${booking.guest_name || "Guest"}`,
    }))

    return ranges
  } catch (error) {
    console.error("Error fetching unavailable ranges:", error)
    throw error
  }
}

/**
 * Check if a date range is available
 * Uses direct string comparison on YYYY-MM-DD without Date objects
 */
export async function checkAvailabilityRange(
  checkIn: string,
  checkOut: string,
): Promise<AvailabilityCheckResult> {
  try {
    const reqStart = checkIn.slice(0, 10)
    const reqEnd = checkOut.slice(0, 10)

    const ranges = await fetchUnavailableRanges()

    const conflictingRanges = ranges.filter(
      range => range.start < reqEnd && range.end > reqStart,
    )

    return {
      isAvailable: conflictingRanges.length === 0,
      conflictingRanges,
      bookingConflicts: [],
    }
  } catch (error) {
    console.error("Error checking availability range:", error)
    throw error
  }
}

/**
 * Convert date ranges to individual blocked dates array (YYYY-MM-DD strings)
 */
export function convertRangesToBlockedDates(
  ranges: DateRange[] | null,
): string[] {
  if (!ranges || !ranges.length) return []

  const blockedDates: string[] = []
  const seenDates = new Set<string>()

  for (const range of ranges) {
    const startStr = range.start || (range as AvailabilityRange).start_date
    const endStr = range.end || (range as AvailabilityRange).end_date
    if (!startStr || !endStr) continue

    const [y, m, d] = startStr.slice(0, 10).split("-").map(Number)
    const [endY, endM, endD] = endStr.slice(0, 10).split("-").map(Number)

    const cur = new Date(Date.UTC(y, m - 1, d))
    const endDate = new Date(Date.UTC(endY, endM - 1, endD))

    while (cur < endDate) {
      const dateStr = cur.toISOString().slice(0, 10)
      if (!seenDates.has(dateStr)) {
        seenDates.add(dateStr)
        blockedDates.push(dateStr)
      }
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  blockedDates.sort()
  return blockedDates
}

/**
 * Convert date ranges to individual blocked dates for the checkout picker.
 * Blocks dates strictly after a booking's check-in through its check-out date
 * (inclusive), so a guest may check out on another booking's check-in date
 * (back-to-back) while dates during another booking's stay remain restricted.
 */
export function convertRangesToCheckoutBlockedDates(
  ranges: DateRange[] | null,
): string[] {
  if (!ranges || !ranges.length) return []

  const blockedDates: string[] = []
  const seenDates = new Set<string>()

  for (const range of ranges) {
    const startStr = range.start || (range as AvailabilityRange).start_date
    const endStr = range.end || (range as AvailabilityRange).end_date
    if (!startStr || !endStr) continue

    const [y, m, d] = startStr.slice(0, 10).split("-").map(Number)
    const [endY, endM, endD] = endStr.slice(0, 10).split("-").map(Number)

    // Start one day after check-in so checkout on a check-in date is allowed.
    const cur = new Date(Date.UTC(y, m - 1, d + 1))
    const endDate = new Date(Date.UTC(endY, endM - 1, endD))

    while (cur <= endDate) {
      const dateStr = cur.toISOString().slice(0, 10)
      if (!seenDates.has(dateStr)) {
        seenDates.add(dateStr)
        blockedDates.push(dateStr)
      }
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  blockedDates.sort()
  return blockedDates
}

// Global sync cooldown to prevent multiple syncs across all endpoints
const lastSyncTime = { timestamp: 0 }
const SYNC_COOLDOWN = 5 * 60 * 1000 // 5 minutes in milliseconds

let inFlightSync: Promise<void> | null = null

/**
 * Trigger iCal sync with proper error handling, global cooldown, and
 * serialization of the full sync operation across concurrent callers.
 */
export async function triggeriCalSync(force = false): Promise<void> {
  const now = Date.now()

  // Check global cooldown (unless forced)
  if (!force && now - lastSyncTime.timestamp < SYNC_COOLDOWN) {
    console.log(
      "Skipping sync - using cached data (last sync:",
      new Date(lastSyncTime.timestamp).toISOString(),
      ")",
    )
    return
  }

  if (inFlightSync) {
    await inFlightSync
    return
  }

  const runSync = async (): Promise<void> => {
    try {
      const { runIcalSync } = await import("./ical-sync")
      const { merged } = await runIcalSync(force, 30000)
      console.log(
        "Bookings sync completed successfully, merged ranges:",
        merged.length,
      )
      lastSyncTime.timestamp = now
    } catch (syncError) {
      console.warn("Error syncing bookings:", syncError)
      throw syncError
    } finally {
      inFlightSync = null
    }
  }

  const syncPromise = runSync()
  inFlightSync = syncPromise
  await syncPromise
}
