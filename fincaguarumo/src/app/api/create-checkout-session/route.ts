import { NextRequest } from "next/server"
import Stripe from "stripe"
import getRequestBody from "../../../lib/getRequestBody"

export async function POST(request: NextRequest) {
  const { customerDetails, bookingDetails } = await getRequestBody(request)

  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")

  const customer = await stripeInstance.customers.create({
    name: customerDetails.name,
    email: customerDetails.email,
  })

  const origin = request.headers.get("origin") || "http://localhost:3000"

  const session = await stripeInstance.checkout.sessions.create({
    ui_mode: "custom",
    customer: customer.id,
    line_items: [
      {
        price_data: {
          currency: bookingDetails.currency || "usd",
          product_data: {
            name: bookingDetails.title,
            description: bookingDetails.description,
          },
          unit_amount: bookingDetails.totalPrice * 100,
        },
        quantity: 1,
      },
    ],
    adaptive_pricing: {
      enabled: true,
    },
    currency: bookingDetails.currency || "usd",
    // currency_options: {},
    mode: "payment",
    return_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  })

  return Response.json({
    clientSecret: session.client_secret,
  })
}
