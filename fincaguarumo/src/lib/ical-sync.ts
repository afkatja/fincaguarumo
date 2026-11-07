import IcalExpander from "ical-expander"
import { addDays, subDays } from "date-fns"
import crypto from "crypto"
import { Booking, getSanityBookings } from "@/lib/setBookings"
import bookingToNights from "@/lib/bookingToNights"
import { createClient } from "@supabase/supabase-js"

/**
 * Extract date from ical-expander component, handling both DATE and DATE-TIME values.
 * For DATE values (all-day events), returns YYYY-MM-DD format without timezone conversion.
 * For DATE-TIME values, returns ISO string.
 *
 * The property object from ical-expander has a jCal array structure:
 *   jCal: [ propertyName, params, valueType, value ]
 * where valueType is 'date' for all-day events (no timezone conversion needed)
 * or 'date-time' for timed events (needs timezone conversion).
 */
function extractDateFromComponent(
  component: any,
  propertyName: "dtstart" | "dtend",
  fallbackDate?: Date,
): string {
  let property
  try {
    property = component.getFirstProperty?.(propertyName)
  } catch {
    property = undefined
  }
  if (!property) {
    if (fallbackDate) return fallbackDate.toISOString()
    throw new Error(`Property ${propertyName} not found on component`)
  }

  // Check jCal array for value type and value
  // jCal: [ propertyName, params, valueType, value ]
  const jCal = property.jCal
  if (jCal && Array.isArray(jCal) && jCal.length >= 4) {
    const valueType = jCal[2] // 'date' or 'date-time'
    const value = jCal[3]

    // If it's a DATE value (all-day event), return YYYY-MM-DD without timezone conversion
    if (valueType === "date") {
      const dateStr = String(value)
      if (dateStr.length === 8) {
        // YYYYMMDD format
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      }
      if (dateStr.length === 10 && dateStr.includes("-")) {
        // Already YYYY-MM-DD format
        return dateStr
      }
    }
  }

  // For DATE-TIME or unknown, use the existing toJSDate conversion
  try {
    const dateObj = property.toJSDate()
    return dateObj.toISOString()
  } catch {
    if (fallbackDate) return fallbackDate.toISOString()
    throw new Error(`Failed to convert ${propertyName} to date`)
  }
}

export interface IcsSyncRow {
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

export interface BookingResponse {
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
  // booking: process.env.BOOKING_ICAL,
  // vrbo: process.env.VRBO_ICAL,
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const memoryCache: {
  ics: Record<string, string>
  etag: Record<string, string>
} = { ics: {}, etag: {} }

function hashIcs(ics: string) {
  return crypto.createHash("sha256").update(ics).digest("hex")
}

async function fetchIcsWithConditional(
  url: string,
  cacheKey: string,
  force = false,
  feedTimeoutMs = 30000,
) {
  const headers: Record<string, string> = {}

  if (force) {
    headers["Cache-Control"] = "no-cache"
  }

  // Use ETag for conditional requests
  if (memoryCache.etag[cacheKey] && !force) {
    headers["If-None-Match"] = memoryCache.etag[cacheKey]
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), feedTimeoutMs)

  try {
    const res = await fetch(url, { headers, signal: controller.signal })

    if (res.status === 304 && !force) {
      return { changed: false, ics: memoryCache.ics[cacheKey] }
    }
    if (!res.ok) throw new Error(`Failed to fetch iCal (${res.status}), ${url}`)

    const ics = await res.text()
    memoryCache.ics[cacheKey] = ics

    // Store ETag for future conditional requests
    const etag = res.headers.get("etag")
    if (etag) {
      memoryCache.etag[cacheKey] = etag
    }

    return { changed: true, ics }
  } finally {
    clearTimeout(timeoutId)
  }
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

  for (const e of events) {
    const status = e.component.getFirstPropertyValue("status")
    if (status && String(status).toUpperCase() === "CANCELLED") continue
    // Use extractDateFromComponent with fallback to e.startDate/e.endDate
    const start = extractDateFromComponent(
      e.component,
      "dtstart",
      e.startDate.toJSDate(),
    )
    const end = extractDateFromComponent(
      e.component,
      "dtend",
      e.endDate.toJSDate(),
    )
    const uid = e.component.getFirstPropertyValue("uid") ?? undefined
    const summary = e.component.getFirstPropertyValue("summary") ?? undefined

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

  interface ICalComponent {
    getFirstPropertyValue(name: string): string | null
    getFirstProperty(name: string): any
  }

  interface OccurrenceItem {
    component: ICalComponent
  }

  interface Occurrence {
    item?: OccurrenceItem
    component: ICalComponent
    startDate: { toJSDate: () => Date }
    endDate: { toJSDate: () => Date }
  }

  for (const o of occurrences) {
    const occurrence = o as Occurrence
    const component = occurrence.item?.component ?? occurrence.component
    const status = component.getFirstPropertyValue("status")
    if (status && String(status).toUpperCase() === "CANCELLED") continue
    // Use extractDateFromComponent with fallback to occurrence.startDate/endDate
    const start = extractDateFromComponent(
      component,
      "dtstart",
      occurrence.startDate.toJSDate(),
    )
    const end = extractDateFromComponent(
      component,
      "dtend",
      occurrence.endDate.toJSDate(),
    )
    const uid = component.getFirstPropertyValue("uid") ?? undefined
    const summary = component.getFirstPropertyValue("summary") ?? undefined
    const description =
      component.getFirstPropertyValue("description") ?? undefined
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

  if (summary) {
    const cleaned = summary
      .replace(/^(Reserved|Booking|Reservation|Booked)\s*[-:]?\s*/i, "")
      .trim()
    if (cleaned && cleaned.length > 0) {
      info.name = cleaned
    }
  }

  if (description) {
    const guestsMatch = description.match(/(?:guests?|occupants?):?\s*(\d+)/i)
    if (guestsMatch) {
      info.guests = parseInt(guestsMatch[1], 10)
    }

    const emailMatch = description.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) {
      info.email = emailMatch[0]
    }

    const phoneMatch = description.match(
      /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/,
    )
    if (phoneMatch) {
      info.phone = phoneMatch[0]
    }
  }

  return info
}

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

  const ranges = bookings
    .map(b => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }))
    .sort((a, b) => +a.start - +b.start)

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

function createRedactedBooking(bookingData: any) {
  return {
    uid: bookingData.uid,
    source: bookingData.source,
    booking_type: bookingData.booking_type,
    has_guest_name: !!bookingData.guest_name,
    has_total_price: !!bookingData.total_price,
    guest_count: bookingData.guests,
    check_in_month: bookingData.check_in
      ? new Date(bookingData.check_in).toISOString().slice(0, 7)
      : null,
    check_out_month: bookingData.check_out
      ? new Date(bookingData.check_out).toISOString().slice(0, 7)
      : null,
  }
}

async function saveBookingToSupabase(syncRow: IcsSyncRow) {
  try {
    const booking = mapToBookingForSupabase(syncRow)

    if (!booking.uid) {
      console.error("Cannot save booking: UID is required for upsert operation")
      return null
    }

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

    if (booking.totalPrice) {
      bookingData.total_price = booking.totalPrice
    }

    const { data, error } = await supabase
      .from("bookings")
      .upsert([bookingData], { onConflict: "uid" })
      .select()

    if (error) {
      console.error("Error upserting booking to Supabase:", error)
      return null
    }

    const recordId = data?.[0]?.id
    return recordId
  } catch (error) {
    console.error("Error saving booking to Supabase:", error)
    return null
  }
}

async function cleanupCancelledBookings(
  currentIcalUids: Set<string>,
  successfulFeedSources: string[],
): Promise<void> {
  try {
    if (successfulFeedSources.length === 0) {
      console.log("No successful feeds to clean up")
      return
    }

    const { data: existingBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("uid, source")
      .in("source", successfulFeedSources)

    if (fetchError) {
      console.error("Error fetching existing bookings for cleanup:", fetchError)
      return
    }

    if (!existingBookings || existingBookings.length === 0) {
      return
    }

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

    const { error: deleteBookingsError } = await supabase
      .from("bookings")
      .delete()
      .in("uid", cancelledUids)

    if (deleteBookingsError) {
      console.error("Error deleting cancelled bookings:", deleteBookingsError)
    } else {
      console.log(
        `Successfully deleted ${cancelledUids.length} cancelled bookings`,
      )
    }
  } catch (error) {
    console.error("Error in cleanupCancelledBookings:", error)
  }
}

export async function runIcalSync(
  force = false,
  feedTimeoutMs = 30000,
): Promise<{
  bookings: BookingResponse[]
  merged: ReturnType<typeof mergeBookings>
}> {
  const feeds = Object.entries(FEEDS).filter(([, v]) => !!v) as [
    string,
    string,
  ][]
  const feedSources = feeds.map(([name]) => name)

  const allSyncRows: IcsSyncRow[] = []
  const allBookingResponses: BookingResponse[] = []
  const currentIcalUids = new Set<string>()
  const successfulFeeds = new Set<string>()

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

  for (const [name, url] of feeds) {
    try {
      const key = `ical_${name}`
      const { ics, changed } = await fetchIcsWithConditional(
        url!,
        key,
        force,
        feedTimeoutMs,
      )

      if (!ics) {
        console.warn(`No ICS data for ${name}, skipping`)
        continue
      }

      const syncRows = parseIcsToBookings(ics, name)

      allSyncRows.push(...syncRows)

      const bookingResponses = syncRows.map(mapToBookingResponse)
      allBookingResponses.push(...bookingResponses)

      if (changed) {
        successfulFeeds.add(name)

        let savedCount = 0
        let skippedCount = 0
        let errorCount = 0

        for (const syncRow of syncRows) {
          try {
            let uid = syncRow.uid
            if (!uid) {
              const hashInput = `${name}-${syncRow.start}-${syncRow.end}`
              uid = hashIcs(hashInput).substring(0, 32)
              syncRow.uid = uid
            }

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
      } else {
        console.log(`Feed ${name} returned 304, using cached reservations`)
        for (const syncRow of syncRows) {
          if (syncRow.uid) {
            currentIcalUids.add(syncRow.uid)
          }
        }
      }
    } catch (err) {
      console.error(
        `Error fetching/parsing ${name}, using cached reservations:`,
        err,
      )
      const key = `ical_${name}`
      const cachedIcs = memoryCache.ics[key]
      if (cachedIcs) {
        const syncRows = parseIcsToBookings(cachedIcs, name)
        allSyncRows.push(...syncRows)
        const bookingResponses = syncRows.map(mapToBookingResponse)
        allBookingResponses.push(...bookingResponses)
        for (const syncRow of syncRows) {
          if (syncRow.uid) {
            currentIcalUids.add(syncRow.uid)
          }
        }
      }
    }
  }

  if (successfulFeeds.size === 0) {
    console.log("No feeds successfully synced, skipping cleanup")
  } else {
    try {
      await cleanupCancelledBookings(currentIcalUids, [...successfulFeeds])
    } catch (cleanupError) {
      console.error("Error cleaning up cancelled bookings:", cleanupError)
    }
  }

  const allBookings = [
    ...allSyncRows.map(mapToBookingForSupabase),
    ...sanityBookingsCached,
  ]

  const uniqueByUid: Record<string, Booking> = {}
  const withoutUid: Booking[] = []
  for (const b of allBookings) {
    if (b.uid) uniqueByUid[b.uid] = uniqueByUid[b.uid] ?? b
    else withoutUid.push(b)
  }
  const deduped = Object.values(uniqueByUid).concat(withoutUid)

  const merged = mergeBookings(deduped)

  return { bookings: allBookingResponses, merged }
}
