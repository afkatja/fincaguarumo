import { writeClient, client } from "../sanity/lib/client"
import { BOOKINGS_QUERY } from "../sanity/lib/queries"

export type Booking = {
  uid?: string
  start: string
  end: string
  summary?: string
  source?: string
  guestName?: string
  description?: string
  email?: string
  phone?: string
  guests?: number
  totalPrice?: number
  currency?: string
}

export async function setBookings({
  checkIn,
  checkOut,
  guestName,
  source,
  uid,
  email,
  phone,
  guests,
  totalPrice,
  currency,
}: {
  checkIn: Date
  checkOut: Date
  guestName: string
  source: "direct" | "airbnb" | "booking" | "expedia"
  uid: string
  email?: string
  phone?: string
  guests?: number
  totalPrice?: number
  currency?: string
}) {
  try {
    const bookingDoc: any = {
      _type: "booking",
      _id: `booking-${uid}`,
      checkIn,
      checkOut,
      guestName,
      source,
      uid,
    }

    // Add optional fields if provided
    if (email) bookingDoc.email = email
    if (phone) bookingDoc.phone = phone
    if (guests) bookingDoc.guests = guests
    if (totalPrice) bookingDoc.totalPrice = totalPrice
    if (currency) bookingDoc.currency = currency

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
    guestName: booking.guestName,
    email: booking.email,
    phone: booking.phone,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    currency: booking.currency,
  }))
}
