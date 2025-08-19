import type { SanityImageSource } from "@sanity/asset-utils"

export const BOOKING_TYPE = {
  tour: "tour",
  villa: "villa",
} as const

export type BookingType = keyof typeof BOOKING_TYPE

type SanityImageObject = {
  _type: "image"
  asset: {
    _ref: string
    _type: "reference"
  }
} & SanityImageSource & { alt: string }
export type { SanityImageObject }

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
    duration: 0,
    location: "",
    body: "",
    date: tomorrow,
    checkIn: tomorrow,
    checkOut: later,
    guests: 1,
    price: 0,
    totalPrice: 0,
    currency: "usd",
    geo: { lat: 0, lng: 0 },
  },
}
export type BookingData = typeof initialBookingData
