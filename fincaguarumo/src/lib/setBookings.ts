import { writeClient, client } from "../sanity/lib/client"
import { BOOKINGS_QUERY } from "../sanity/lib/queries"

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
    const bookingDoc = {
      _type: "booking",
      _id: `booking-${uid}`,
      checkIn,
      checkOut,
      guestName,
      source,
      uid,
    }

    const booking = await writeClient.createIfNotExists(bookingDoc)
    return booking
  } catch (error) {
    console.error("Error setting booking:", error)
    throw new Error(
      "Failed to set booking: " +
        (error instanceof Error ? error.message : String(error)),
    )
  }
}

export async function getSanityBookings(): Promise<Booking[]> {
  const bookings = await client.fetch(BOOKINGS_QUERY)
  return bookings.map((booking: any) => ({
    uid: booking.uid,
    start: new Date(booking.checkIn).toISOString(),
    end: new Date(booking.checkOut).toISOString(),
    summary: `${booking.guestName} (${booking.source})`,
    source: "sanity",
  }))
}
