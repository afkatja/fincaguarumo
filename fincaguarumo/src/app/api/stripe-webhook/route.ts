import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event = request.body as unknown as Stripe.Event
  const buffer = await request.arrayBuffer()
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = request.headers.get("stripe-signature") as string
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
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      console.log(`Checkout session completed: ${session.id}`)
      // TODO: Handle successful checkout session (e.g., mark booking as paid, send confirmation email)
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
      const paymentMethod = event.data.object
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
