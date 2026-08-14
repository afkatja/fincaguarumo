import { NextResponse } from "next/server"
import IcalExpander from "ical-expander"
import { addDays, subDays } from "date-fns"
import crypto from "crypto"
import { Booking, getSanityBookings } from "@/lib/setBookings"
import bookingToNights from "@/lib/bookingToNights"
import { createClient } from "@supabase/supabase-js"
import { verifyAdminAuth } from "@/lib/auth"

/**
 * Internal sync DTO containing full guest metadata from iCal parsing
 * Used for persistence and internal deduplication logic
 */
interface IcsSyncRow {
  uid?: string
  start: string
  end: string
  summary?: string
  source: string
  guestInfo: {
    name?: string
    email?: string
    phone?: string
    guests?: number
  }
  rawDescription?: string
}

/**
 * Sanitized response DTO for client consumption
 * Only includes non-sensitive booking information
 */
interface BookingResponse {
  uid?: string
  start: string
  end: string
  summary?: string
  source?: string
  guestName?: string
  isTest?: boolean
}

const FEEDS: Record<string, string | undefined> = {
  airbnb: process.env.AIRBNB_ICAL,
  booking: process.env.BOOKING_ICAL,
  vrbo: process.env.VRBO_ICAL,
  // yourrentals: process.env.YOURRENTALS_ICAL,
  // expedia: process.env.ICAL_EXPEDIA,
}

// Initialize Supabase client for saving bookings and updating availability
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const memoryCache: {
  hash: string
  ics: Record<string, string>
  parsed: any
} = { hash: "", ics: {}, parsed: null }

function hashIcs(ics: string) {
  return crypto.createHash("sha256").update(ics).digest("hex")
}

async function fetchIcsWithConditional(
  url: string,
  cacheKey: string,
  force = false,
) {
  const headers: Record<string, string> = {}

  // If forcing sync, bypass cache by adding cache-busting header
  if (force) {
    headers["Cache-Control"] = "no-cache"
  }

  const res = await fetch(url, { headers })
  if (res.status === 304 && !force) {
    // not changed
    return { changed: false, ics: memoryCache.ics[cacheKey] }
  }
  if (!res.ok) throw new Error(`Failed to fetch iCal (${res.status}), ${url}`)

  const ics = await res.text()
  const hash = hashIcs(ics)
  memoryCache.ics[cacheKey] = ics
  memoryCache.hash = hash
  const parsed = parseIcsToBookings(ics, cacheKey)
  memoryCache.parsed = parsed
  return { changed: true, ics }
}

function parseIcsToBookings(
  icsText: string,
  sourceName: string,
  lookBackYears = 2,
  lookAheadYears = 1,
): IcsSyncRow[] {
  const expander = new IcalExpander({ ics: icsText, maxIterations: 1000 })
  const from = subDays(new Date(), 365 * lookBackYears)
  const to = addDays(new Date(), 365 * lookAheadYears)

  const { events, occurrences } = expander.between(from, to)

  const out: IcsSyncRow[] = []

  // Single (non-recurring) EVENTs
  for (const e of events) {
    const status = e.component.getFirstPropertyValue("status")
    if (status && String(status).toUpperCase() === "CANCELLED") continue
    const start = e.startDate.toJSDate().toISOString()
    const end = e.endDate.toJSDate().toISOString()
    const uid = e.component.getFirstPropertyValue("uid") ?? undefined
    const summary = e.component.getFirstPropertyValue("summary") ?? undefined

    // Try to extract guest name and other details from summary or description
    const description =
      e.component.getFirstPropertyValue("description") ?? undefined
    const guestInfo = extractGuestInfo(summary, description)

    out.push({
      uid,
      start,
      end,
      summary,
      source: sourceName,
      guestInfo,
      rawDescription: description,
    })
  }

  // Expanded occurrences from recurring events
  for (const o of occurrences) {
    const status = o.component.getFirstPropertyValue("status")
    if (status && String(status).toUpperCase() === "CANCELLED") continue
    const start = o.startDate.toJSDate().toISOString()
    const end = o.endDate.toJSDate().toISOString()
    const uid = o.component.getFirstPropertyValue("uid") ?? undefined
    const summary = o.component.getFirstPropertyValue("summary") ?? undefined
    const description =
      o.component.getFirstPropertyValue("description") ?? undefined
    const guestInfo = extractGuestInfo(summary, description)

    out.push({
      uid,
      start,
      end,
      summary,
      source: sourceName,
      guestInfo,
      rawDescription: description,
    })
  }

  return out
}

/**
 * Extract guest information from iCal summary/description
 * Different platforms format this differently
 */
function extractGuestInfo(
  summary?: string,
  description?: string,
): {
  name?: string
  email?: string
  phone?: string
  guests?: number
} {
  const text = summary || description || ""
  const info: {
    name?: string
    email?: string
    phone?: string
    guests?: number
  } = {}

  // Try to extract name - often the summary contains the guest name
  // Common patterns: "Reserved - John Doe", "John Doe", "Booking: John Doe"
  if (summary) {
    // Remove common prefixes
    const cleaned = summary
      .replace(/^(Reserved|Booking|Reservation|Booked)\s*[-:]?\s*/i, "")
      .trim()
    if (cleaned && cleaned.length > 0) {
      info.name = cleaned
    }
  }

  // Try to extract guest count from description
  if (description) {
    // Look for patterns like "Guests: 4", "4 guests", "Adults: 2, Children: 1"
    const guestsMatch = description.match(/(?:guests?|occupants?):?\s*(\d+)/i)
    if (guestsMatch) {
      info.guests = parseInt(guestsMatch[1], 10)
    }

    // Look for email patterns
    const emailMatch = description.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) {
      info.email = emailMatch[0]
    }

    // Look for phone patterns
    const phoneMatch = description.match(
      /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/,
    )
    if (phoneMatch) {
      info.phone = phoneMatch[0]
    }
  }

  return info
}

/**
 * Convert internal IcsSyncRow to sanitized BookingResponse for client consumption
 */
function mapToBookingResponse(syncRow: IcsSyncRow): BookingResponse {
  return {
    uid: syncRow.uid,
    start: syncRow.start,
    end: syncRow.end,
    summary: syncRow.summary,
    source: syncRow.source,
    guestName: syncRow.guestInfo.name,
  }
}

/**
 * Convert internal IcsSyncRow to legacy Booking format for Supabase compatibility
 */
function mapToBookingForSupabase(syncRow: IcsSyncRow): Booking {
  return {
    uid: syncRow.uid,
    start: syncRow.start,
    end: syncRow.end,
    summary: syncRow.summary,
    source: syncRow.source,
    guestName: syncRow.guestInfo.name,
    email: syncRow.guestInfo.email,
    phone: syncRow.guestInfo.phone,
    guests: syncRow.guestInfo.guests,
  }
}

function mergeBookings(bookings: Booking[]) {
  if (!bookings.length) return []

  // Convert all dates to UTC Date objects and sort by start
  const ranges = bookings
    .map(b => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }))
    .sort((a, b) => +a.start - +b.start)

  // Merge overlapping ranges
  const merged: { start: Date; end: Date }[] = [{ ...ranges[0] }]
  for (let i = 1; i < ranges.length; i++) {
    const cur = ranges[i]
    const last = merged[merged.length - 1]
    if (cur.start <= last.end) {
      if (cur.end > last.end) last.end = cur.end
    } else {
      merged.push({ ...cur })
    }
  }

  return merged.map(m => ({
    start: m.start.toISOString(),
    end: m.end.toISOString(),
    blocked: bookingToNights(m.start, m.end),
  }))
}

/**
 * Create a redacted copy of booking data for safe logging
 * Removes PII while preserving useful debugging information
 */
function createRedactedBooking(bookingData: any) {
  return {
    uid: bookingData.uid,
    source: bookingData.source,
    booking_type: bookingData.booking_type,
    // Include only non-sensitive fields for debugging
    has_guest_name: !!bookingData.guest_name,
    has_total_price: !!bookingData.total_price,
    guest_count: bookingData.guests,
    // Redate dates to only show month/year for debugging
    check_in_month: bookingData.check_in
      ? new Date(bookingData.check_in).toISOString().slice(0, 7)
      : null,
    check_out_month: bookingData.check_out
      ? new Date(bookingData.check_out).toISOString().slice(0, 7)
      : null,
  }
}

/**
 * Save or update booking in Supabase using atomic upsert
 */
async function saveBookingToSupabase(syncRow: IcsSyncRow) {
  try {
    const booking = mapToBookingForSupabase(syncRow)

    // Ensure UID is present for upsert constraint
    if (!booking.uid) {
      console.error("Cannot save booking: UID is required for upsert operation")
      return null
    }

    // Log what we're trying to save
    // console.log(
    //   `Upserting booking: ${booking.guestName || "Unknown"} from ${booking.source}, UID: ${booking.uid}`,
    // )

    // Build booking data with only required columns
    const bookingData: any = {
      uid: booking.uid,
      check_in: booking.start,
      check_out: booking.end,
      guest_name: booking.guestName || "Unknown",
      source: booking.source || "Unknown",
      booking_type: "villa",
      currency: booking.currency || "usd",
      guests: booking.guests || 1,
    }

    // Add optional price fields if present
    if (booking.totalPrice) {
      bookingData.total_price = booking.totalPrice
    }

    // console.log(
    //   "Upserting booking data:",
    //   JSON.stringify(createRedactedBooking(bookingData), null, 2),
    // )

    // Atomic upsert with conflict resolution on uid
    const { data, error } = await supabase
      .from("bookings")
      .upsert([bookingData], { onConflict: "uid" })
      .select()

    if (error) {
      console.error("Error upserting booking to Supabase:", error)
      return null
    }

    const recordId = data?.[0]?.id
    // console.log(`Successfully upserted booking: ${recordId}`)
    return recordId
  } catch (error) {
    console.error("Error saving booking to Supabase:", error)
    return null
  }
}

/**
 * Update availability table with booked dates
 * This marks all dates within booking ranges as unavailable
 */
async function updateAvailabilityTable(
  bookings: Booking[],
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // console.log(
      //   `Updating availability table (attempt ${attempt}/${maxRetries}) with ${bookings.length} bookings`,
      // )

      // First, remove old availability entries that are in the past
      const today = new Date().toISOString()
      const { error: cleanupError } = await supabase
        .from("availability")
        .delete()
        .lt("end_date", today)

      if (cleanupError) {
        console.error(
          "Error cleaning up old availability entries:",
          cleanupError,
        )
        if (attempt === maxRetries) throw cleanupError
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }

      // For each booking, ensure availability entries exist
      let successCount = 0
      let errorCount = 0

      for (const booking of bookings) {
        const startDate = new Date(booking.start)
        const endDate = new Date(booking.end)

        // Skip past bookings for availability table - only future/present bookings
        // affect current availability
        if (endDate < new Date()) {
          continue
        }

        try {
          // Check if this exact range already exists in availability
          const { data: existing } = await supabase
            .from("availability")
            .select("id, is_available, reason, booking_uid")
            .eq("start_date", booking.start)
            .eq("end_date", booking.end)
            .maybeSingle()

          if (!existing) {
            // Create new availability entry marked as unavailable
            const availabilityRecord: any = {
              start_date: booking.start,
              end_date: booking.end,
              is_available: false,
              updated_at: new Date().toISOString(),
            }

            // Add optional fields that may not exist in schema yet
            if (booking.source) {
              availabilityRecord.reason = `Booked via ${booking.source}`
            }
            if (booking.uid) {
              availabilityRecord.booking_uid = booking.uid
            }

            const { error } = await supabase
              .from("availability")
              .insert([availabilityRecord])

            if (error) {
              console.error(
                `Error creating availability entry for booking ${booking.uid}:`,
                error,
              )
              errorCount++
            } else {
              successCount++
            }
          } else if (existing.is_available !== false) {
            // Update existing entry to mark as unavailable
            const { error } = await supabase
              .from("availability")
              .update({
                is_available: false,
                updated_at: new Date().toISOString(),
                reason: booking.source
                  ? `Booked via ${booking.source}`
                  : existing.reason,
                booking_uid: booking.uid || existing.booking_uid,
              })
              .eq("id", existing.id)

            if (error) {
              console.error(
                `Error updating availability entry for booking ${booking.uid}:`,
                error,
              )
              errorCount++
            } else {
              successCount++
            }
          } else {
            // Already marked as unavailable
            successCount++
          }
        } catch (bookingError) {
          console.error(
            `Error processing booking ${booking.uid}:`,
            bookingError,
          )
          errorCount++
        }
      }

      // console.log(
      //   `Availability table update completed: ${successCount} successful, ${errorCount} errors`,
      // )

      if (errorCount === 0 || attempt === maxRetries) {
        return // Success or final attempt, exit the function
      }

      // If we had errors but haven't exhausted retries, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    } catch (error) {
      console.error(
        `Error updating availability table (attempt ${attempt}/${maxRetries}):`,
        error,
      )
      if (attempt === maxRetries) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

/**
 * Clean up bookings that are no longer present in iCal feeds
 * This handles cancelled bookings by removing them from the database
 */
async function cleanupCancelledBookings(
  currentIcalUids: Set<string>,
  feedSources: string[],
): Promise<void> {
  try {
    // Get all existing bookings from iCal sources
    const { data: existingBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("uid, source")
      .in("source", feedSources)

    if (fetchError) {
      console.error("Error fetching existing bookings for cleanup:", fetchError)
      return
    }

    if (!existingBookings || existingBookings.length === 0) {
      return
    }

    // Find bookings that are no longer in current feeds
    const cancelledUids: string[] = []
    for (const booking of existingBookings) {
      if (booking.uid && !currentIcalUids.has(booking.uid)) {
        cancelledUids.push(booking.uid)
      }
    }

    if (cancelledUids.length === 0) {
      return
    }

    console.log(`Found ${cancelledUids.length} cancelled bookings to clean up`)

    // Delete cancelled bookings from bookings table
    const { error: deleteBookingsError } = await supabase
      .from("bookings")
      .delete()
      .in("uid", cancelledUids)

    if (deleteBookingsError) {
      console.error("Error deleting cancelled bookings:", deleteBookingsError)
      return
    } else {
      console.log(
        `Successfully deleted ${cancelledUids.length} cancelled bookings`,
      )
    }

    // Delete corresponding availability entries
    const { error: deleteAvailabilityError } = await supabase
      .from("availability")
      .delete()
      .in("booking_uid", cancelledUids)

    if (deleteAvailabilityError) {
      console.error(
        "Error deleting availability entries for cancelled bookings:",
        deleteAvailabilityError,
      )
    } else {
      console.log(
        `Successfully deleted availability entries for ${cancelledUids.length} cancelled bookings`,
      )
    }
  } catch (error) {
    console.error("Error in cleanupCancelledBookings:", error)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedForce = searchParams.get("force") === "true"
    
    // Only allow force=true for authenticated admin users
    let forceSync = false
    if (requestedForce) {
      try {
        await verifyAdminAuth(request)
        forceSync = true
      } catch (authError: any) {
        // If not authenticated/authorized, ignore the force parameter
        console.warn("Unauthorized force sync attempt, ignoring force parameter")
        forceSync = false
      }
    }

    const feeds = Object.entries(FEEDS).filter(([, v]) => !!v) as [
      string,
      string,
    ][]
    const feedSources = feeds.map(([name]) => name)

    const allSyncRows: IcsSyncRow[] = []
    const allBookingResponses: BookingResponse[] = []
    const currentIcalUids = new Set<string>()
    const successfulFeedSources: string[] = []

    // Fetch Sanity bookings and convert to response format
    let sanityBookingsCached: any[] = []
    try {
      sanityBookingsCached = await getSanityBookings()
      const sanityResponses: BookingResponse[] = sanityBookingsCached.map(
        booking => ({
          uid: booking.uid,
          start: booking.start,
          end: booking.end,
          summary: booking.summary,
          source: booking.source,
          guestName: booking.guestName,
          isTest: booking.isTest,
        }),
      )
      allBookingResponses.push(...sanityResponses)
    } catch (err) {
      console.error("Error fetching Sanity bookings:", err)
    }

    // Fetch iCal feeds
    for (const [name, url] of feeds) {
      try {
        const key = `ical_${name}`
        const { ics } = await fetchIcsWithConditional(url!, key, forceSync)

        if (!ics) continue
        const syncRows = parseIcsToBookings(ics!, name)

        allSyncRows.push(...syncRows)

        // Convert to sanitized responses for client
        const bookingResponses = syncRows.map(mapToBookingResponse)
        allBookingResponses.push(...bookingResponses)

        // Save each parsed booking to Supabase
        // console.log(`Processing ${syncRows.length} bookings from ${name}`)
        let savedCount = 0
        let skippedCount = 0
        let errorCount = 0

        for (const syncRow of syncRows) {
          try {
            // Generate a UID if missing (using hash of source + dates)
            let uid = syncRow.uid
            if (!uid) {
              const hashInput = `${name}-${syncRow.start}-${syncRow.end}`
              uid = hashIcs(hashInput).substring(0, 32)
              syncRow.uid = uid
              // console.log(`Generated UID for booking: ${uid}`)
            }

            // Track current UIDs for cleanup
            currentIcalUids.add(uid)

            const result = await saveBookingToSupabase(syncRow)

            if (result) {
              savedCount++
            } else {
              skippedCount++
            }
          } catch (saveError) {
            console.error(`Failed to save booking from ${name}:`, saveError)
            errorCount++
          }
        }

        // Track this feed as successfully processed
        successfulFeedSources.push(name)

        // console.log(
        //   `Saved ${savedCount}, skipped ${skippedCount}, errors ${errorCount} bookings from ${name}`,
        // )
      } catch (err) {
        console.error(`Error fetching/parsing ${name}:`, err)
        // continue — don't fail the whole response if one feed fails
      }
    }

    // Clean up cancelled bookings after processing all feeds
    // Only pass successfully fetched/parsed feed sources to prevent
    // failed feeds from causing their existing bookings to be deleted
    try {
      await cleanupCancelledBookings(currentIcalUids, successfulFeedSources)
    } catch (cleanupError) {
      console.error("Error cleaning up cancelled bookings:", cleanupError)
      // Continue anyway - the API should still return the booking data
    }

    // Convert all sync rows to Booking format for merge logic
    const allBookings = [
      ...allSyncRows.map(mapToBookingForSupabase),
      ...sanityBookingsCached,
    ]

    // Optional: deduplicate by UID or by identical ranges (simple)
    const uniqueByUid: Record<string, Booking> = {}
    const withoutUid: Booking[] = []
    for (const b of allBookings) {
      if (b.uid) uniqueByUid[b.uid] = uniqueByUid[b.uid] ?? b
      else withoutUid.push(b)
    }
    const deduped = Object.values(uniqueByUid).concat(withoutUid)

    // Merge overlapping date ranges to get final blocked ranges
    const merged = mergeBookings(deduped)

    // Update availability table with all bookings
    // This is critical - always update availability even if some bookings fail
    try {
      await updateAvailabilityTable(deduped)
      // console.log("Successfully updated availability table")
    } catch (availabilityError) {
      console.error("Failed to update availability table:", availabilityError)
      // Continue anyway - the API should still return the booking data
      // but log the error for monitoring
    }

    return NextResponse.json({ bookings: allBookingResponses, merged })
  } catch (err) {
    console.error("API error merging bookings:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
