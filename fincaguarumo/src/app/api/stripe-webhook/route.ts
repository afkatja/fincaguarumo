import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sendConfirmationEmail } from "@/lib/sendConfirmationEmail"
import { setBookings } from "../../../lib/setBookings"
import { sendErrorEmail } from "../../../lib/sendErrorEmail"
import { parsePropertyDate, formatForEmail } from "../../../lib/dateUtils"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  console.log("WEBHOOK RECEIVED")
  if (!process.env.STRIPE_API_KEY) {
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

  console.error("Webhook secrets?", {
    stripeKey: !!process.env.STRIPE_SECRET_KEY,
    webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
  })
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
    console.log(`⚠️  Webhook signature verification failed.`, err.message)
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
        const customerDetails = {
          name: metadata?.customerName || "",
          email: metadata?.customerEmail || "",
          phoneNumber: metadata?.customerPhone || "",
        }
        const bookingDetails = {
          type: metadata?.type || "",
          title: metadata?.title || "",
          description: metadata?.description || "",
          duration: Number(metadata?.duration) || 0,
          location: metadata?.location || "",
          body: metadata?.body || "",
          date: parsePropertyDate(metadata?.date || ""),
          checkIn: parsePropertyDate(metadata?.checkIn || ""),
          checkOut: parsePropertyDate(metadata?.checkOut || ""),
          price: Number(metadata?.price) || 0,
          basePrice: Number(metadata?.price) || 0, // Use price as basePrice for webhook
          totalPrice: (metadata?.totalPrice as unknown as number) || 0,
          currency: metadata?.currency || "USD",
          guests: Number(metadata?.guests) || 0,
          geo: metadata?.geo ? JSON.parse(metadata.geo) : {},
        }

        // Send confirmation email - continue even if fails
        try {
          if (process.env.NODE_ENV === "production") {
            const response = await sendConfirmationEmail({
              customerDetails,
              bookingDetails,
            })
            console.log("Confirmation email sent successfully.", response)
          } else {
            console.log("Skipping email in development mode", {
              customerDetails,
              bookingDetails,
            })
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          console.error("Failed to send confirmation email:", error)
          await sendErrorEmail({
            subject: "Failed to Send Booking Confirmation Email",
            error: "Email sending failed",
            details: `Session ID: ${id}, Customer: ${customerDetails.email}, Error: ${errorMessage}`,
          })
        }

        // Create booking - continue even if fails
        try {
          // Save to Sanity with all details
          const bookingResponse = await setBookings({
            checkIn: bookingDetails.checkIn,
            checkOut: bookingDetails.checkOut,
            guestName: customerDetails.name,
            source: "direct",
            uid: event.data.object.id,
            email: customerDetails.email,
            phone: customerDetails.phoneNumber,
            guests: bookingDetails.guests,
            totalPrice: bookingDetails.totalPrice,
            currency: bookingDetails.currency,
          })
          console.log(
            "Booking created in Sanity successfully.",
            bookingResponse,
          )

          // Save to Supabase with all required fields
          try {
            const siteUrl =
              process.env.NEXT_PUBLIC_SITE_URL ||
              (process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : "http://localhost:3000")

            const supabaseResponse = await fetch(`${siteUrl}/api/bookings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                checkIn: bookingDetails.checkIn.toISOString(),
                checkOut: bookingDetails.checkOut.toISOString(),
                guestName: customerDetails.name,
                email: customerDetails.email,
                phone: customerDetails.phoneNumber,
                source: "direct",
                uid: event.data.object.id,
                guests: bookingDetails.guests,
                bookingType: bookingDetails.type,
                totalPrice: bookingDetails.totalPrice,
                currency: bookingDetails.currency,
              }),
            })

            if (supabaseResponse.ok) {
              console.log("Booking saved to Supabase successfully")

              // Also update availability table to mark dates as unavailable
              try {
                const availabilityResponse = await fetch(
                  `${siteUrl}/api/availability`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      startDate: bookingDetails.checkIn.toISOString(),
                      endDate: bookingDetails.checkOut.toISOString(),
                      isAvailable: false,
                      reason: `Booked via Direct - ${customerDetails.name}`,
                      bookingUid: event.data.object.id,
                    }),
                  },
                )

                if (availabilityResponse.ok) {
                  console.log("Availability updated successfully")
                } else {
                  console.error("Failed to update availability")
                }
              } catch (availabilityError) {
                console.error("Error updating availability:", availabilityError)
              }
            } else {
              const errorData = await supabaseResponse.json().catch(() => ({}))
              console.error("Failed to save booking to Supabase:", errorData)
            }
          } catch (supabaseError) {
            console.error("Error saving booking to Supabase:", supabaseError)
          }

          // Send success notification
          const checkInFormatted = isNaN(bookingDetails.checkIn.getTime())
            ? "TBD"
            : formatForEmail(bookingDetails.checkIn)
          const checkOutFormatted = isNaN(bookingDetails.checkOut.getTime())
            ? "TBD"
            : formatForEmail(bookingDetails.checkOut)
          await sendErrorEmail({
            subject: "New Booking Successfully Created",
            error: "Booking successful",
            details: `Session ID: ${id}, Customer: ${customerDetails.name} (${customerDetails.email}), Check-in: ${checkInFormatted}, Check-out: ${checkOutFormatted}`,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          console.error("Failed to create booking in Sanity:", error)
          await sendErrorEmail({
            subject: "Failed to Create Booking in Sanity",
            error: "Booking creation failed",
            details: `Session ID: ${id}, Customer: ${customerDetails.email}, Error: ${errorMessage}`,
          })
        }
        break
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)
        // TODO: Handle successful payment intent (e.g., update booking/payment status)
        break
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object
        console.log(`PaymentIntent for ${paymentIntent.amount} failed.`)
        // TODO: Handle failed payment (e.g., notify user, update booking/payment status)
        break
      }
      case "checkout.session.expired": {
        const session = event.data.object
        console.log(`Checkout session expired: ${session.id}`)
        // TODO: Handle expired session (e.g., release reserved resources, notify user)
        break
      }
      case "payment_method.attached": {
        // const paymentMethod = event.data.object
        // Then define and call a method to handle the successful attachment of a PaymentMethod.
        // handlePaymentMethodAttached(paymentMethod);
        break
      }
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`)
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
