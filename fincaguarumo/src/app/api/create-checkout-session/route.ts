import { NextRequest } from "next/server"
import Stripe from "stripe"
import getRequestBody from "../../../lib/getRequestBody"
import { BookingData, SerializedBookingData } from "../../../types"

export async function POST(request: NextRequest) {
  const { customerDetails, bookingDetails }: SerializedBookingData =
    await getRequestBody(request)

  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")

  const customer = await stripeInstance.customers.create({
    name: customerDetails.name,
    email: customerDetails.email,
  })

  const origin = request.headers.get("origin") || "//localhost:3000"

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
          unit_amount: Math.round(bookingDetails.totalPrice * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      customerName: customerDetails.name,
      customerEmail: customerDetails.email,
      customerPhone: customerDetails.phoneNumber,
      type: bookingDetails.type,
      date: bookingDetails.date,
      guests: String(bookingDetails.guests),
      price: String(bookingDetails.price),
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
      title: bookingDetails.title,
      location: bookingDetails.location,
      body: "",
      duration: String(bookingDetails.duration),
      description: bookingDetails.description,
      currency: bookingDetails.currency,
      totalPrice: String(bookingDetails.totalPrice),
      geo: JSON.stringify(bookingDetails.geo),
    },
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
