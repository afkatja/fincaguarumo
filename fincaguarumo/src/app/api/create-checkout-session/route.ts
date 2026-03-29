import { NextRequest } from "next/server"
import Stripe from "stripe"
import getRequestBody from "../../../lib/getRequestBody"
import { SerializedBookingData } from "../../../types"
import { calculateEffectivePrice } from "../../../lib/pricingEngine"
import { calculateDuration } from "../../../lib/dateUtils"

const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")

export async function POST(request: NextRequest) {
  try {
    const {
      customerDetails,
      bookingDetails,
      pricingRules,
    }: SerializedBookingData = await getRequestBody(request)

    const customer = await stripeInstance.customers.create({
      name: customerDetails.name,
      email: customerDetails.email,
    })

    const origin = request.headers.get("origin") || "https://localhost:3000"

    // Ensure the origin has the proper protocol
    const baseUrl = origin.startsWith("http")
      ? origin
      : `https://${origin.replace("//", "")}`

    // Calculate correct price based on booking type
    let finalPrice: number
    if (bookingDetails.type === "villa") {
      // For villas, calculate price using pricingRules
      const villaPricingRules = pricingRules || []
      const checkInDate = bookingDetails.checkIn
        ? new Date(bookingDetails.checkIn)
        : undefined
      const checkOutDate = bookingDetails.checkOut
        ? new Date(bookingDetails.checkOut)
        : undefined

      // Calculate duration on server side to ensure accuracy
      const duration = calculateDuration(
        checkInDate || null,
        checkOutDate || null,
      )

      const result = calculateEffectivePrice({
        pricingRules: villaPricingRules,
        guests: bookingDetails.guests,
        duration,
        checkInDate,
        bookingType: "villa",
      })
      finalPrice = result.total
    } else {
      // For tours, use the totalPrice (already includes VAT)
      finalPrice = bookingDetails.totalPrice
    }

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
            unit_amount: Math.round(finalPrice * 100),
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
      mode: "payment",
      return_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    })

    return Response.json({
      clientSecret: session.client_secret,
    })
  } catch (error) {
    console.error("Error creating a checkout session", error)
    return Response.json(
      { error: "Error creating checkout session" },
      { status: 500 },
    )
  }
}
