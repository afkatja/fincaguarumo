import { sendConfirmationEmail } from "../../../lib/sendConfirmationEmail"
import { setBookings } from "../../../lib/setBookings"
import { sendErrorEmail } from "../../../lib/sendErrorEmail"
import { parsePropertyDate, formatForEmail } from "../../../lib/dateUtils"
import { createSupabaseAdmin } from "@/lib/auth"
import type { BookingType } from "@/types"
import Stripe from "stripe"
import { withRetries } from "@/lib/monitoring"
import { RETRY_CONFIG } from "@/lib/monitoring/config"
import { queueFailedEmail } from "@/lib/monitoring/emailQueue"
import { withDatabaseMonitoring } from "@/lib/monitoring/dbMonitor"

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
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await withRetries(
      () =>
        sendConfirmationEmail({
          source: null,
          customerDetails,
          bookingDetails,
          pricingRules: [], // Webhook doesn't need pricingRules, but it's required by BookingData type
        }),
      RETRY_CONFIG.email,
      "send-confirmation-email",
    )

    if (result.success) {
      console.log("Confirmation email sent successfully.")
      return { success: true }
    } else {
      // Queue failed email for retry
      await queueFailedEmail({
        emailType: "confirmation",
        recipientEmail: customerDetails.email,
        subject: `Your ${bookingDetails.type === "villa" ? "Villa" : "Tour"} Booking Confirmation`,
        content: { customerDetails, bookingDetails },
        errorMessage: result.error?.message || "Unknown email error",
      })

      return { success: false, error: result.error?.message }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Failed to send confirmation email:", errorMessage)

    // Queue for retry
    await queueFailedEmail({
      emailType: "confirmation",
      recipientEmail: customerDetails.email,
      subject: `Your ${bookingDetails.type === "villa" ? "Villa" : "Tour"} Booking Confirmation`,
      content: { customerDetails, bookingDetails },
      errorMessage,
    })

    return { success: false, error: errorMessage }
  }
}

export async function saveBookingToSanity(
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!bookingDetails.checkIn || !bookingDetails.checkOut) {
      throw new Error(
        "checkIn and checkOut dates are required for Sanity booking",
      )
    }

    const result = await withRetries(
      () =>
        setBookings({
          checkIn: bookingDetails.checkIn!, // We've already validated this above
          checkOut: bookingDetails.checkOut!, // We've already validated this above
          guestName: customerDetails.name,
          source: "direct",
          uid: sessionId,
          email: customerDetails.email,
          phone: customerDetails.phoneNumber,
          guests: bookingDetails.guests,
          totalPrice: bookingDetails.totalPrice,
          currency: bookingDetails.currency,
          isTest: undefined, // Let setBookings auto-detect test bookings
        }),
      RETRY_CONFIG.sanity,
      "save-booking-to-sanity",
    )

    if (result.success) {
      console.log("Booking created in Sanity successfully.")
      return { success: true }
    } else {
      return { success: false, error: result.error?.message }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Failed to create booking in Sanity:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function saveBookingToSupabase(
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
  sessionId: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await withRetries(
      () =>
        withDatabaseMonitoring("insert", "bookings", async () => {
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
            throw new Error(bookingError.message)
          }

          return bookingData
        }),
      RETRY_CONFIG.supabase,
      "save-booking-to-supabase",
    )

    if (result.success) {
      console.log("Booking saved to Supabase successfully")
      return { success: true, data: result.data }
    } else {
      return {
        success: false,
        error:
          result.error?.message || result.error?.toString() || "Unknown error",
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error saving booking to Supabase:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function updateAvailability(
  bookingDetails: BookingDetails,
  sessionId: string,
  customerName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await withRetries(
      () =>
        withDatabaseMonitoring("insert", "availability", async () => {
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
            throw new Error(availabilityError.message)
          }

          return true
        }),
      RETRY_CONFIG.availability,
      "update-availability",
    )

    if (result.success) {
      console.log("Availability updated successfully")
      return { success: true }
    } else {
      return {
        success: false,
        error:
          result.error?.message || result.error?.toString() || "Unknown error",
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error updating availability:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function notifyPartialFailure(
  sessionId: string,
  customerDetails: CustomerDetails,
  bookingDetails: BookingDetails,
  failedOperations: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const checkInFormatted = formatForEmail(bookingDetails.checkIn!)
    const checkOutFormatted = formatForEmail(bookingDetails.checkOut!)

    const result = await withRetries(
      () =>
        sendErrorEmail({
          subject: `Booking ${failedOperations.length === 1 ? "Partially" : "Fully"} Failed - ${failedOperations.join(" & ")}`,
          error: "Booking processing incomplete",
          details: `Session ID: ${sessionId}, Customer: ${customerDetails.name} (${customerDetails.email}), Check-in: ${checkInFormatted}, Check-out: ${checkOutFormatted}, Failed operations: ${failedOperations.join(", ")}`,
        }),
      RETRY_CONFIG.email,
      "send-partial-failure-notification",
    )

    if (result.success) {
      console.log("Partial failure notification sent successfully")
      return { success: true }
    } else {
      // Queue failed notification email
      await queueFailedEmail({
        emailType: "admin_notification",
        recipientEmail: process.env.CONTACT_EMAIL || "admin@fincaguarumo.com",
        subject: `Booking ${failedOperations.length === 1 ? "Partially" : "Fully"} Failed - ${failedOperations.join(" & ")}`,
        content: {
          sessionId,
          customerDetails,
          bookingDetails,
          failedOperations,
          checkInFormatted,
          checkOutFormatted,
        },
        errorMessage:
          result.error?.message ||
          "Failed to send partial failure notification",
      })

      return { success: false, error: result.error?.message }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Failed to send error notification:", errorMessage)

    // Queue for retry
    await queueFailedEmail({
      emailType: "admin_notification",
      recipientEmail: process.env.CONTACT_EMAIL || "admin@fincaguarumo.com",
      subject: `Booking Failed - ${failedOperations.join(" & ")}`,
      content: { sessionId, customerDetails, bookingDetails, failedOperations },
      errorMessage,
    })

    return { success: false, error: errorMessage }
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
