import { NextResponse } from "next/server"
import IcalExpander from "ical-expander"
import { addDays } from "date-fns"
import crypto from "crypto"
import { Booking, getSanityBookings } from "@/lib/setBookings"
import bookingToNights from "@/lib/bookingToNights"

const FEEDS: Record<string, string | undefined> = {
  airbnb: process.env.AIRBNB_ICAL,
  booking: process.env.BOOKING_ICAL,
  // expedia: process.env.ICAL_EXPEDIA,
}

const memoryCache: {
  hash: string
  ics: Record<string, string>
  parsed: any
} = { hash: "", ics: {}, parsed: null }

function hashIcs(ics: string) {
  return crypto.createHash("sha256").update(ics).digest("hex")
}

async function fetchIcsWithConditional(url: string, cacheKey: string) {
  const headers: Record<string, string> = {}

  const res = await fetch(url, { headers })
  if (res.status === 304) {
    // not changed
    return { changed: false, ics: memoryCache.ics[cacheKey] }
  }
  if (!res.ok) throw new Error(`Failed to fetch iCal (${res.status})`)

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
  lookAheadYears = 1
): Booking[] {
  const expander = new IcalExpander({ ics: icsText, maxIterations: 1000 })
  const from = new Date()
  const to = addDays(new Date(), 365 * lookAheadYears)

  const { events, occurrences } = expander.between(from, to)

  const out: Booking[] = []

  // Single (non-recurring) EVENTs
  for (const e of events) {
    const status = e.component.getFirstPropertyValue("status")
    if (status && String(status).toUpperCase() === "CANCELLED") continue
    const start = e.startDate.toJSDate().toISOString()
    const end = e.endDate.toJSDate().toISOString()
    const uid = e.component.getFirstPropertyValue("uid") ?? undefined
    const summary = e.component.getFirstPropertyValue("summary") ?? undefined
    out.push({ uid, start, end, summary, source: sourceName })
  }

  // Expanded occurrences from recurring events
  for (const o of occurrences) {
    const status = o.component.getFirstPropertyValue("status")
    if (status && String(status).toUpperCase() === "CANCELLED") continue
    const start = o.startDate.toJSDate().toISOString()
    const end = o.endDate.toJSDate().toISOString()
    const uid = o.component.getFirstPropertyValue("uid") ?? undefined
    const summary = o.component.getFirstPropertyValue("summary") ?? undefined
    out.push({ uid, start, end, summary, source: sourceName })
  }

  return out
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
      // overlap -> extend end if needed
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

export async function GET() {
  try {
    const feeds = Object.entries(FEEDS).filter(([, v]) => !!v) as [
      string,
      string,
    ][]

    const allBookings: Booking[] = []

    // Fetch Sanity bookings
    try {
      const sanityBookings = await getSanityBookings()
      allBookings.push(...sanityBookings)
    } catch (err) {
      console.error("Error fetching Sanity bookings:", err)
    }

    // Fetch iCal feeds
    for (const [name, url] of feeds) {
      try {
        const key = `ical_${name}`
        const { ics } = await fetchIcsWithConditional(url!, key)
        if (!ics) continue
        const bookings = parseIcsToBookings(ics!, name)
        allBookings.push(...bookings)
      } catch (err) {
        console.error(`Error fetching/parsing ${name}:`, err)
        // continue — don't fail the whole response if one feed fails
      }
    }

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

    return NextResponse.json({ bookings: deduped, merged })
  } catch (err) {
    console.error("API error merging bookings:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
