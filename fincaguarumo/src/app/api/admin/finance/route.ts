import Stripe from "stripe"
import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"
import { verifyAdminAuth } from "@/lib/auth"

const stripe = new Stripe(process.env.STRIPE_API_KEY!)

// Module-scope constants for manual charge validation
const MAX_MANUAL_AMOUNT = 1000000 // 10,000.00 in cents (10k max)
const ALLOWED_CURRENCIES = new Set(["usd", "eur", "gbp", "crc"])

export async function POST(request: Request) {
  try {
    await verifyAdminAuth(request)

    const body = await request.json()
    const {
      reservationId,
      paymentMethodId,
      expectedAmount,
      expectedCurrency,
      isManual,
      source,
    } = body

    if (!reservationId || !paymentMethodId) {
      return NextResponse.json(
        { error: "reservationId and paymentMethodId are required" },
        { status: 400 },
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    let amount: number
    let currency: string
    let externalReservationId: string
    let internalBookingId: string

    // Manual mode: use provided amount and currency directly
    if (isManual) {
      if (!expectedAmount || !expectedCurrency) {
        return NextResponse.json(
          {
            error:
              "expectedAmount and expectedCurrency are required for manual mode",
          },
          { status: 400 },
        )
      }

      // Validate expectedAmount as a positive integer within maximum
      if (
        !Number.isInteger(expectedAmount) ||
        expectedAmount <= 0 ||
        expectedAmount > MAX_MANUAL_AMOUNT
      ) {
        return NextResponse.json(
          {
            error: `expectedAmount must be a positive integer (max ${MAX_MANUAL_AMOUNT} cents)`,
          },
          { status: 400 },
        )
      }

      // Validate expectedCurrency against allowlist
      const normalizedCurrency = expectedCurrency.toLowerCase()
      if (!ALLOWED_CURRENCIES.has(normalizedCurrency)) {
        return NextResponse.json(
          {
            error: `expectedCurrency must be one of: ${Array.from(ALLOWED_CURRENCIES).join(", ").toUpperCase()}`,
          },
          { status: 400 },
        )
      }

      amount = expectedAmount
      currency = normalizedCurrency
      externalReservationId = reservationId
      internalBookingId = `manual-${reservationId}`
    } else {
      // Auto mode: try to find booking in database
      let { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .select(
          "id, total_price, currency, external_reservation_id, source, uid",
        )
        .eq("id", reservationId)
        .maybeSingle()

      // If not found by internal ID, try external reservation ID
      if (bookingError || !booking) {
        // Try to find by external_reservation_id with source if provided
        let query = supabaseAdmin
          .from("bookings")
          .select(
            "id, total_price, currency, external_reservation_id, source, uid",
          )
          .eq("external_reservation_id", reservationId)

        if (source) {
          query = query.eq("source", source)
        }

        const { data: extBooking, error: extError } = await query.maybeSingle()

        if (!extError && extBooking) {
          booking = extBooking
          bookingError = null
        }
      }

      // If still not found, try uid as fallback (for legacy bookings)
      if (bookingError || !booking) {
        const { data: uidBooking, error: uidError } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, total_price, currency, external_reservation_id, source, uid",
          )
          .eq("uid", reservationId)
          .maybeSingle()

        if (!uidError && uidBooking) {
          booking = uidBooking
          bookingError = null
        }
      }

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 },
        )
      }

      amount = booking.total_price
      currency = booking.currency?.toLowerCase() || "usd"
      externalReservationId = booking.external_reservation_id || reservationId
      internalBookingId = booking.id

      // Validate amounts match in auto mode
      if (expectedAmount !== undefined && expectedAmount !== amount) {
        return NextResponse.json(
          { error: "Amount mismatch between client and server" },
          { status: 400 },
        )
      }
      if (expectedCurrency && expectedCurrency.toLowerCase() !== currency) {
        return NextResponse.json(
          { error: "Currency mismatch between client and server" },
          { status: 400 },
        )
      }
    }

    // Use internal ID for idempotency key to prevent double-charges
    // Key is based on booking + amount + currency so the same reservation
    // cannot be charged multiple times regardless of payment method
    const idempotencyKey = `booking-vcc:${internalBookingId}:${amount}:${currency}`

    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        payment_method: paymentMethodId,
        confirm: true,
        payment_method_types: ["card"],
        payment_method_options: {
          card: {
            moto: true,
          },
        },
        description: `Booking.com VCC reservation ${externalReservationId}`,
        metadata: {
          reservation_id: internalBookingId,
          external_reservation_id: externalReservationId,
          source: isManual ? "manual_vcc" : "booking_com_vcc",
        },
      },
      { idempotencyKey },
    )

    if (intent.status === "succeeded") {
      return NextResponse.json({ paymentIntentId: intent.id })
    }

    if (intent.status === "requires_action") {
      return NextResponse.json(
        {
          error: "Payment requires additional authentication (3D Secure)",
          status: intent.status,
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: `Stripe payment status: ${intent.status}`,
        status: intent.status,
      },
      { status: 422 },
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Finance charge error:", error.message)
      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status: 500 },
      )
    }

    if (typeof error === "object" && error !== null) {
      const stripeError = error as { type?: string; message?: string }
      if (stripeError.type === "StripeCardError") {
        return NextResponse.json(
          { error: stripeError.message || "Card error" },
          { status: 402 },
        )
      }
    }

    console.error("Unknown finance charge error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
