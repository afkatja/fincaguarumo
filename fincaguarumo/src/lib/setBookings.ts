import { client } from "../sanity/lib/client"

export type Booking = {
  uid?: string
  start: string
  end: string
  summary?: string
  source?: string
}

export async function setBookings({
  checkIn,
  checkOut,
  guestName,
  source,
  uid,
}: {
  checkIn: Date
  checkOut: Date
  guestName: string
  source: "direct" | "airbnb" | "booking" | "expedia"
  uid: string
}) {
  try {
    const booking = await client.create({
      _type: "booking",
      checkIn,
      checkOut,
      guestName,
      source,
      uid,
    })

    return booking
  } catch (error) {
    console.error("Error setting booking:", error)
    return Response.json({ error: "Failed to set booking" }, { status: 500 })
  }
}

export async function getSanityBookings(): Promise<Booking[]> {
  const bookings = await client.fetch(
    `*[_type == "booking" && !(_id in path("drafts.**"))]{checkIn, checkOut, guestName, source, uid}`
  )
  return bookings.map((booking: any) => ({
    uid: booking.uid,
    start: new Date(booking.checkIn).toISOString(),
    end: new Date(booking.checkOut).toISOString(),
    summary: `${booking.guestName} (${booking.source})`,
    source: "sanity",
  }))
}
