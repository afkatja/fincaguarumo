import { NextRequest } from "next/server"
import Stripe from "stripe"
import getRequestBody from "../../../lib/getRequestBody"
import { SerializedBookingData } from "../../../types"
import { calculateEffectivePrice } from "../../../lib/pricingEngine"
import { calculateDuration } from "../../../lib/dateUtils"

const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Create checkout session request received")

    const body = await request.text()
    console.log("📝 Request body:", body)

    const {
      customerDetails,
      bookingDetails,
      pricingRules,
    }: SerializedBookingData = JSON.parse(body)

    console.log("👤 Customer details:", {
      name: customerDetails.name,
      email: customerDetails.email,
      phone: customerDetails.phoneNumber,
    })

    console.log("🏠 Booking details:", {
      type: bookingDetails.type,
      title: bookingDetails.title,
      price: bookingDetails.price,
      totalPrice: bookingDetails.totalPrice,
      currency: bookingDetails.currency,
      guests: bookingDetails.guests,
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
    })

    console.log("💰 Pricing rules count:", pricingRules?.length || 0)

    console.log("🎯 Creating Stripe customer...")
    const customer = await stripeInstance.customers.create({
      name: customerDetails.name,
      email: customerDetails.email,
    })

    console.log("✅ Customer created:", customer.id)

    const origin = request.headers.get("origin") || "https://localhost:3000"

    // Ensure the origin has the proper protocol
    const baseUrl = origin.startsWith("http")
      ? origin
      : `https://${origin.replace("//", "")}`

    // Calculate correct price based on booking type
    let finalPrice: number
    console.log(
      "💵 Calculating final price for booking type:",
      bookingDetails.type,
    )

    if (bookingDetails.type === "villa") {
      // For villas, calculate price using pricingRules
      const villaPricingRules = pricingRules || []
      const checkInDate = bookingDetails.checkIn
        ? new Date(bookingDetails.checkIn)
        : undefined
      const checkOutDate = bookingDetails.checkOut
        ? new Date(bookingDetails.checkOut)
        : undefined

      console.log("📅 Villa dates:", {
        checkIn: checkInDate,
        checkOut: checkOutDate,
      })

      // Calculate duration on server side to ensure accuracy
      const duration = calculateDuration(
        checkInDate || null,
        checkOutDate || null,
      )

      console.log("⏱️ Duration:", duration, "nights")

      const result = calculateEffectivePrice({
        pricingRules: villaPricingRules,
        guests: bookingDetails.guests,
        duration,
        checkInDate,
        bookingType: "villa",
      })

      console.log("🧮 Price calculation result:", result)
      finalPrice = result.total
    } else {
      // For tours, use totalPrice (already includes VAT)
      console.log(
        "🎫 Tour price (using totalPrice):",
        bookingDetails.totalPrice,
      )
      finalPrice = bookingDetails.totalPrice
    }

    console.log("💰 Final price:", finalPrice)

    console.log("🎪 Creating Stripe checkout session...")
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

    console.log("✅ Checkout session created:", session.id)
    console.log(
      "🔗 Client secret generated:",
      session.client_secret ? "✅" : "❌",
    )

    return Response.json({
      clientSecret: session.client_secret,
    })
  } catch (error) {
    console.error("💥 Error creating checkout session:", error)

    // Log specific error details
    if (error instanceof Error) {
      console.error("📋 Error message:", error.message)
      console.error("📋 Error stack:", error.stack)
    }

    // Check if it's a Stripe error
    if (error && typeof error === "object" && "type" in error) {
      console.error("💳 Stripe error type:", (error as any).type)
      console.error("💳 Stripe error code:", (error as any).code)
    }

    return Response.json(
      {
        error: "Error creating checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
