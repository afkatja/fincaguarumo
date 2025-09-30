import { createEvent, EventAttributes } from "ics"

export type Booking = {
  title?: string
  description?: string
  location?: string
  url?: string
  uid: string
  checkIn: Date
  checkOut: Date
  guestName?: string
  source: "direct" | "airbnb" | "booking" | "expedia"
}

export function bookingToIcsEvent(b: Booking): string {
  const start: [number, number, number] = [
    b.checkIn.getFullYear(),
    b.checkIn.getMonth() + 1,
    b.checkIn.getDate(),
  ]
  const end: [number, number, number] = [
    b.checkOut.getFullYear(),
    b.checkOut.getMonth() + 1,
    b.checkOut.getDate(),
  ]

  const event: EventAttributes = {
    uid: b.uid,
    start,
    end,
    title: `Booking - ${b.source}`,
    description: b.guestName ? `Guest: ${b.guestName}` : "",
  }

  const { error, value } = createEvent(event)
  if (error) throw error
  return value ?? ""
}

export function bookingsToCalendar(bookings: Booking[]): string {
  const events = bookings.map(bookingToIcsEvent).join("\n")
  return `BEGIN:VCALENDAR
          VERSION:2.0
          PRODID:-//Finca Guarumo//Villa Bruno//EN
          CALSCALE:GREGORIAN
          METHOD:PUBLISH
          ${events}
          END:VCALENDAR`
}
