import { NextResponse } from "next/server"
import { BOOKINGS_QUERY } from "../../../../sanity/lib/queries"
import { client } from "../../../../sanity/lib/client"
import { bookingsToCalendar } from "../../../../lib/ical"

export async function GET() {
  const data = await client.fetch(BOOKINGS_QUERY)
  const bookings = await data.json()

  const ics = bookingsToCalendar(
    bookings.map((b: any) => ({
      uid: b.uid,
      checkIn: new Date(b.checkIn),
      checkOut: new Date(b.checkOut),
      guestName: b.guestName,
      source: b.source,
    }))
  )

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendar.ics",
    },
  })
}
