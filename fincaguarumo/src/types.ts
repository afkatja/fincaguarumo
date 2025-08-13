export const BOOKING_TYPE = {
  tour: "tour",
  villa: "villa",
} as const

export type BookingType = keyof typeof BOOKING_TYPE

const today = new Date()
const tomorrow = new Date(+today + 86400000)
const later = new Date(+today + 259200000)

export const initialBookingData = {
  // type: "tour",
  customerDetails: { name: "", email: "", phoneNumber: "" },
  bookingDetails: {
    type: "tour",
    title: "",
    description: "",
    duration: "",
    location: "",
    body: "",
    date: tomorrow.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    checkIn: tomorrow.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    checkOut: later.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    guests: 1,
    price: 0,
    totalPrice: 0,
    currency: "usd",
    geo: { lat: 0, lon: 0 },
  },
}
export type BookingData = typeof initialBookingData
