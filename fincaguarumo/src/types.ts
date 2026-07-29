import type { SanityImageSource } from "@sanity/asset-utils"
import type { BlockContent, Home as HomeType } from "../sanity.types"
import {
  normalizeToNoon,
  parsePropertyDate,
  toUTCISOString,
} from "./lib/dateUtils"
import type { PricingRule } from "./lib/pricingEngine"

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

export interface FAQType {
  slug: { current: string }
  question: string
  answerFormat?: "text" | "blockContent" | null
  answer?: string | null
  answerBlockContent?: BlockContent | null
  keywords: string[] | null
  lastModified?: string
  showOnVillaBruno: boolean | null
  category: {
    title: string
    slug: { current: string }
    language: string | null
  }
}

const today = new Date()
const tomorrow = new Date(+today + 86400000)
const later = new Date(+today + 259200000)

export const initialBookingData = {
  // type: "tour",
  source: null as "page" | "external" | null,
  customerDetails: { name: "", email: "", phoneNumber: "" },
  bookingDetails: {
    type: "tour" as BookingType,
    title: "",
    description: "",
    duration: 0,
    location: "",
    body: "",
    date: tomorrow,
    checkIn: null as Date | null,
    checkOut: null as Date | null,
    guests: 1,
    price: 0, // Legacy field for backward compatibility
    basePrice: 0, // Base price for calculation (per-night for villa, per-person for tour)
    totalPrice: 0,
    currency: "usd",
    geo: { lat: 0, lng: 0 },
  },
  pricingRules: [] as PricingRule[], // Dynamic pricing rules from Sanity CMS
}

type Serialize<T> = {
  [K in keyof T]: T[K] extends Date
    ? string | null
    : T[K] extends object
      ? Serialize<T[K]>
      : T[K]
}

export type SerializedBookingData = {
  source: "global" | "page" | null
  customerDetails: { name: string; email: string; phoneNumber: string }
  bookingDetails: {
    type: BookingType
    title: string
    description: string
    duration: number
    location: string
    body: string
    date: string | null
    checkIn: string | null
    checkOut: string | null
    guests: number
    price: number
    basePrice: number
    totalPrice: number
    currency: string
    geo: { lat: number; lng: number }
  }
  pricingRules: PricingRule[]
}
export type BookingData = typeof initialBookingData

export function serializeBookingData(data: BookingData): SerializedBookingData {
  return {
    ...data,
    bookingDetails: {
      ...data.bookingDetails,
      date: toUTCISOString(normalizeToNoon(data.bookingDetails.date)),
      checkIn: data.bookingDetails.checkIn
        ? toUTCISOString(normalizeToNoon(data.bookingDetails.checkIn))
        : null,
      checkOut: data.bookingDetails.checkOut
        ? toUTCISOString(normalizeToNoon(data.bookingDetails.checkOut))
        : null,
    },
  } as SerializedBookingData
}

export function deserializeBookingData(
  data: SerializedBookingData,
): BookingData {
  return {
    ...data,
    bookingDetails: {
      ...data.bookingDetails,
      date: data.bookingDetails.date
        ? parsePropertyDate(data.bookingDetails.date!)
        : null,
      checkIn: data.bookingDetails.checkIn
        ? parsePropertyDate(data.bookingDetails.checkIn)
        : null,
      checkOut: data.bookingDetails.checkOut
        ? parsePropertyDate(data.bookingDetails.checkOut)
        : null,
      price: Number(data.bookingDetails.price),
      totalPrice: Number(data.bookingDetails.totalPrice),
      duration: Number(data.bookingDetails.duration),
      guests: Number(data.bookingDetails.guests),
    },
  } as BookingData
}

// LocalStorage utilities that handle date conversion
export function saveBookingDataToLocalStorage(data: BookingData): void {
  if (typeof window !== "undefined") {
    const serialized = serializeBookingData(data)

    localStorage.setItem("bookingData", JSON.stringify(serialized))
  }
}

export function loadBookingDataFromLocalStorage(): BookingData | null {
  if (typeof window !== "undefined") {
    const storedData = localStorage.getItem("bookingData")
    if (storedData) {
      try {
        const parsed: SerializedBookingData = JSON.parse(storedData)
        return deserializeBookingData(parsed)
      } catch {
        // ignore corrupted data
        return null
      }
    }
  }
  return null
}

export type HomeContent = {
  hero_title: string
  hero_slogan: string
  hero_body?: any
  subtitle?: string
  featured_content_title?: string
  featured_blog_title?: string
  intro_body?: any
  mediaUrl?: { url: string }
  mediaPoster?: { url: string; metadata?: { lqip?: string } }
  locationDetails?: HomeType["locationDetails"]
}

interface ReviewAuthor {
  displayName?: string
  photoURI?: string
  name?: string
  location?: string
}

export type TReview = {
  authorAttribution?: {
    displayName: string
    photoURI: string
  }
  publishTime?: Date
  rating?: number
  text?: string

  // Universal format (for Airbnb, Booking.com, etc.)
  author?: ReviewAuthor
  date?: string
  reviewText?: string
  platform?: "google" | "airbnb" | "booking"
  photoUrl?: string
}

export type TTour = {
  title: string
  slug?: { current: string }
  description: string
  mainImage?: SanityImageObject
  slideshow: { images: SanityImageObject[] }
  price: number
  location?: string
  geo?: { lat: number; lng: number }
  guests?: number
  isFeatured?: boolean
  isNew?: boolean
  duration?: number
  body?: any
  language?: string
  isPublished: boolean
  dialog?: IDialog
}
export type IField = {
  _key: string
  value: string
}

export type IDialog = {
  _id: string
  cta?: IField[]
  date?: IField[]
  selectDate?: IField[]
  guests?: IField[]
  adults?: IField[]
  adult?: IField[]
  child?: IField[]
  other?: IField[]
  paymentMethod?: IField[]
  creditCard?: IField[]
  paypal?: IField[]
  people?: IField[]
  person?: IField[]
  total?: IField[]
  ok?: IField[]
  cancel?: IField[]
}
