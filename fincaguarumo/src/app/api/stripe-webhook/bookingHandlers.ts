import { sendConfirmationEmail } from "../../../lib/sendConfirmationEmail"
import { setBookings } from "../../../lib/setBookings"
import { sendErrorEmail } from "../../../lib/sendErrorEmail"
import { parsePropertyDate, formatForEmail } from "../../../lib/dateUtils"
import { createSupabaseAdmin } from "@/lib/auth"
import type { BookingType } from "@/types"
import Stripe from "stripe"

export interface CustomerDetails {
  name: string
  email: string
  phoneNumber: string
}

export interface BookingDetails {
  type: BookingType
  title: string
  description: string
  duration: number
  location: string
  body: string
  date: Date
  checkIn: Date | null
  checkOut: Date | null
  price: number
  basePrice: number
  totalPrice: number
  currency: string
  guests: number
  geo: any
}

export async function sendBookingConfirmationEmail(
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
) {
  try {
    const response = await sendConfirmationEmail({
      source: null,
      customerDetails,
      bookingDetails,
      pricingRules: [], // Webhook doesn't need pricingRules, but it's required by BookingData type
    })
    console.log("Confirmation email sent successfully.", response)
    return { success: true }
  } catch (error) {
    console.error("Failed to send confirmation email:", error)
    return { success: false, error }
  }
}

export async function saveBookingToSanity(
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
  sessionId: string,
) {
  try {
    if (!bookingDetails.checkIn || !bookingDetails.checkOut) {
      throw new Error(
        "checkIn and checkOut dates are required for Sanity booking",
      )
    }

    const response = await setBookings({
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
      guestName: customerDetails.name,
      source: "direct",
      uid: sessionId,
      email: customerDetails.email,
      phone: customerDetails.phoneNumber,
      guests: bookingDetails.guests,
      totalPrice: bookingDetails.totalPrice,
      currency: bookingDetails.currency,
    })
    console.log("Booking created in Sanity successfully.", response)
    return { success: true }
  } catch (error) {
    console.error("Failed to create booking in Sanity:", error)
    return { success: false, error }
  }
}

export async function saveBookingToSupabase(
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
  sessionId: string,
) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        check_in: bookingDetails.checkIn!.toISOString(),
        check_out: bookingDetails.checkOut!.toISOString(),
        guest_name: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phoneNumber,
        source: "direct",
        uid: sessionId,
        guests: bookingDetails.guests,
        booking_type: bookingDetails.type,
        total_price: bookingDetails.totalPrice,
        currency: bookingDetails.currency,
      })
      .select()

    if (bookingError) {
      return { success: false, error: bookingError }
    }

    console.log("Booking saved to Supabase successfully")
    return { success: true, data: bookingData }
  } catch (error) {
    console.error("Error saving booking to Supabase:", error)
    return { success: false, error }
  }
}

export async function updateAvailability(
  bookingDetails: BookingDetails,
  sessionId: string,
  customerName: string,
) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    const { error: availabilityError } = await supabaseAdmin
      .from("availability")
      .insert({
        start_date: bookingDetails.checkIn!.toISOString(),
        end_date: bookingDetails.checkOut!.toISOString(),
        is_available: false,
        reason: `Booked via Direct - ${customerName}`,
        booking_uid: sessionId,
        updated_at: new Date().toISOString(),
      })
      .select()

    if (availabilityError) {
      return { success: false, error: availabilityError }
    }

    console.log("Availability updated successfully")
    return { success: true }
  } catch (error) {
    console.error("Error updating availability:", error)
    return { success: false, error }
  }
}

export async function notifyPartialFailure(
  sessionId: string,
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
  failedOperations: string[],
) {
  try {
    const checkInFormatted = formatForEmail(bookingDetails.checkIn!)
    const checkOutFormatted = formatForEmail(bookingDetails.checkOut!)

    await sendErrorEmail({
      subject: `Booking ${failedOperations.length === 1 ? "Partially" : "Fully"} Failed - ${failedOperations.join(" & ")}`,
      error: "Booking processing incomplete",
      details: `Session ID: ${sessionId}, Customer: ${customerDetails.name} (${customerDetails.email}), Check-in: ${checkInFormatted}, Check-out: ${checkOutFormatted}, Failed operations: ${failedOperations.join(", ")}`,
    })
  } catch (error) {
    console.error("Failed to send error notification:", error)
  }
}

export function extractBookingDetails(
  metadata: Stripe.Checkout.Session["metadata"],
) {
  const parsedDate = parsePropertyDate(metadata?.date || "")
  return {
    type: (metadata?.type as BookingType) || "villa",
    title: metadata?.title || "",
    description: metadata?.description || "",
    duration: Number(metadata?.duration) || 0,
    location: metadata?.location || "",
    body: metadata?.body || "",
    date: parsedDate || new Date(), // Fallback to current date if parsing fails
    checkIn: parsePropertyDate(metadata?.checkIn || ""),
    checkOut: parsePropertyDate(metadata?.checkOut || ""),
    price: Number(metadata?.price) || 0,
    basePrice: Number(metadata?.price) || 0,
    totalPrice: Number(metadata?.totalPrice) || 0,
    currency: metadata?.currency || "usd",
    guests: Number(metadata?.guests) || 0,
    geo: metadata?.geo ? JSON.parse(metadata.geo) : {},
  }
}
