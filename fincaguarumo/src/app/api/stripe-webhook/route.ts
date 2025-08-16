import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sendConfirmationEmail } from "@/lib/sendConfirmationEmail"

export async function POST(request: NextRequest) {
  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")
  const endpointSecret =
    process.env.NODE_ENV === "development"
      ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      : process.env.STRIPE_WEBHOOK_SECRET

  const buffer = await request.arrayBuffer()
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = request.headers.get("stripe-signature") as string

    let event: Stripe.Event
    try {
      event = stripeInstance.webhooks.constructEvent(
        Buffer.from(buffer),
        signature,
        endpointSecret
      )
    } catch (err: any) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message)
      return NextResponse.json({ error: "Webhook failed" }, { status: 400 })
    }

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
          type: metadata?.bookingType || "",
          title: metadata?.bookingTitle || "",
          description: metadata?.bookingDescription || "",
          duration: Number(metadata?.duration) || 0,
          location: metadata?.bookingLocation || "",
          body: metadata?.bookingBody || "",
          date: metadata?.bookingDate || "",
          checkIn: metadata?.checkin || "",
          checkOut: metadata?.checkout || "",
          price: Number(metadata?.price) || 0,
          totalPrice: (metadata?.totalPrice as unknown as number) || 0,
          currency: metadata?.currency || "USD",
          guests: Number(metadata?.guests) || 0,
          geo: metadata?.bookingGeo ? JSON.parse(metadata.bookingGeo) : {},
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

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true })
  }
}
