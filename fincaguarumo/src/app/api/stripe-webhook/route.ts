import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sendConfirmationEmail } from "@/lib/sendConfirmationEmail"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")
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
      { status: 500 }
    )
  }

  // Get the signature sent by Stripe
  const signature = request.headers.get("stripe-signature") as string

  let event: Stripe.Event
  try {
    event = stripeInstance.webhooks.constructEvent(
      buffer,
      signature,
      endpointSecret
    )
  } catch (err: any) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message)
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 })
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
          date: new Date(metadata?.date || ""),
          checkIn: new Date(metadata?.checkIn || ""),
          checkOut: new Date(metadata?.checkOut || ""),
          price: Number(metadata?.price) || 0,
          totalPrice: (metadata?.totalPrice as unknown as number) || 0,
          currency: metadata?.currency || "USD",
          guests: Number(metadata?.guests) || 0,
          geo: metadata?.geo ? JSON.parse(metadata.geo) : {},
        }
        try {
          const response = await sendConfirmationEmail({
            customerDetails,
            bookingDetails,
          })
          console.log("Confirmation email sent successfully.", response)
        } catch (error) {
          console.error("Failed to send confirmation email:", error)
          return NextResponse.json(
            { error: "Failed to send confirmation email" },
            { status: 500 }
          )
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
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }
  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}
