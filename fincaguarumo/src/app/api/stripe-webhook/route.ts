import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import {
  sendBookingConfirmationEmail,
  saveBookingToSanity,
  saveBookingToSupabase,
  updateAvailability,
  notifyPartialFailure,
  extractBookingDetails,
  type CustomerDetails,
  type BookingDetails,
} from "./bookingHandlers"
import { sendErrorEmail } from "@/lib/sendErrorEmail"
import { createSupabaseAdmin } from "@/lib/auth"
import { executeWithIndividualRetries } from "@/lib/monitoring"
import { RETRY_CONFIG } from "@/lib/monitoring/config"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  console.log("WEBHOOK RECEIVED - START")

  if (!process.env.STRIPE_API_KEY) {
    console.error("ERROR: Stripe API key not configured")
    return NextResponse.json(
      { error: "Stripe API key not configured" },
      { status: 500 },
    )
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe Secret key not configured" },
      { status: 500 },
    )
  }
  if (
    !process.env.STRIPE_WEBHOOK_SECRET &&
    !process.env.STRIPE_WEBHOOK_SECRET_LOCAL
  ) {
    return NextResponse.json(
      { error: "Stripe Webhook secret not configured" },
      { status: 500 },
    )
  }
  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY)

  const endpointSecret =
    process.env.NODE_ENV === "development"
      ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      : process.env.STRIPE_WEBHOOK_SECRET

  const buffer = Buffer.from(await request.arrayBuffer())
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  if (!endpointSecret) {
    console.error("Stripe webhook secret is not set.")
    return NextResponse.json(
      { error: "Webhook secret is not configured" },
      { status: 500 },
    )
  }

  // Get the signature sent by Stripe
  const signature = request.headers.get("stripe-signature") as string
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }
  let event: Stripe.Event
  try {
    event = stripeInstance.webhooks.constructEvent(
      buffer,
      signature,
      endpointSecret,
    )
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message)
    return NextResponse.json(
      { error: "Webhook failed", details: err.message },
      { status: 400 },
    )
  }

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const { id, metadata } = event.data.object
        console.log(`Checkout session completed: ${id}`)

        // Extract booking details from metadata
        const customerDetails: CustomerDetails = {
          name: metadata?.customerName || "",
          email: metadata?.customerEmail || "",
          phoneNumber: metadata?.customerPhone || "",
        }

        const bookingDetails = extractBookingDetails(metadata)

        // Validate dates before proceeding
        const checkInValid =
          bookingDetails.checkIn && !isNaN(bookingDetails.checkIn.getTime())
        const checkOutValid =
          bookingDetails.checkOut && !isNaN(bookingDetails.checkOut.getTime())

        if (!checkInValid || !checkOutValid) {
          console.error("Invalid dates in booking details:", {
            checkIn: bookingDetails.checkIn,
            checkOut: bookingDetails.checkOut,
            checkInValid,
            checkOutValid,
            metadata: {
              checkIn: metadata?.checkIn,
              checkOut: metadata?.checkOut,
            },
          })
          await sendErrorEmail({
            subject: "Invalid Dates in Booking Webhook",
            error: "Date parsing failed",
            details: `Session ID: ${id}, Customer: ${customerDetails.email}, Invalid dates - Check-in: ${metadata?.checkIn}, Check-out: ${metadata?.checkOut}`,
          })
          return NextResponse.json(
            { error: "Invalid booking dates" },
            { status: 400 },
          )
        }

        // Execute all operations with individual retry logic
        const operations = [
          {
            name: "send-confirmation-email",
            fn: () =>
              sendBookingConfirmationEmail(customerDetails, bookingDetails),
            config: RETRY_CONFIG.email,
          },
          {
            name: "save-booking-to-sanity",
            fn: () => saveBookingToSanity(customerDetails, bookingDetails, id),
            config: RETRY_CONFIG.sanity,
          },
          {
            name: "save-booking-to-supabase",
            fn: () =>
              saveBookingToSupabase(customerDetails, bookingDetails, id),
            config: RETRY_CONFIG.supabase,
          },
          {
            name: "update-availability",
            fn: () =>
              updateAvailability(bookingDetails, id, customerDetails.name),
            config: RETRY_CONFIG.availability,
          },
        ]

        const results = await executeWithIndividualRetries(operations)

        // Log results and handle failures
        const failedOperations: string[] = []
        const successOperations: string[] = []

        results.forEach(({ name, result }) => {
          if (result.success) {
            successOperations.push(name)
            console.log(`✅ ${name} completed successfully`)
          } else {
            failedOperations.push(name)
            console.error(
              `❌ ${name} failed after ${result.attempts} attempts: ${result.error?.message}`,
            )
          }
        })

        // If any operations failed, send admin notification
        if (failedOperations.length > 0) {
          await notifyPartialFailure(
            id,
            customerDetails,
            bookingDetails,
            failedOperations.map((op: string) =>
              op
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l: string) => l.toUpperCase()),
            ),
          )
        }

        console.log(
          `🎯 Webhook processing complete: ${successOperations.length} succeeded, ${failedOperations.length} failed`,
        )
        break
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session expired: ${session.id}`)

        // Extract booking metadata from expired session
        const { metadata } = session
        if (metadata?.checkIn && metadata?.checkOut) {
          try {
            const supabaseAdmin = createSupabaseAdmin()

            // Release any reserved availability for the expired session
            const { error } = await supabaseAdmin
              .from("availability")
              .delete()
              .eq("booking_uid", session.id)

            if (error) {
              console.error(
                "Failed to release availability for expired session:",
                {
                  sessionId: session.id,
                  error: error.message,
                },
              )
            } else {
              console.log("Released availability for expired session:", {
                sessionId: session.id,
                checkIn: metadata.checkIn,
                checkOut: metadata.checkOut,
              })
            }
          } catch (error) {
            // Log error but don't throw to prevent webhook retries
            console.error("Error processing expired session:", {
              sessionId: session.id,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
        // Always return success for this event to prevent webhook retries
        return NextResponse.json({
          received: true,
          eventType: "checkout.session.expired",
        })
      }
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`)
        return NextResponse.json({
          received: true,
          eventType: "unknown",
        })
    }
  } catch (error: any) {
    console.error("Error processing webhook event:", error.message)
    return NextResponse.json(
      { error: "Handler error", details: error.message },
      { status: 500 },
    )
  }
  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}
