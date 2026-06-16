export async function createBooking(bookingData: {
  name: string
  email: string
  startDate: string
  endDate: string
  guests: number
  propertyId: string
}) {
  try {
    // Create booking record
    const bookingResponse = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    })

    if (!bookingResponse.ok) {
      throw new Error("Booking creation failed")
    }

    const booking = await bookingResponse.json()

    // Create Stripe checkout session
    const stripeResponse = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId: booking.bookingId || booking.id,
        amount: calculateTotalAmount(bookingData),
        customerEmail: bookingData.email,
        propertyName:
          bookingData.propertyId === "villa-bruno"
            ? "Villa Bruno"
            : "Finca Guarumo",
      }),
    })

    if (!stripeResponse.ok) {
      throw new Error("Stripe session creation failed")
    }

    const stripeSession = await stripeResponse.json()

    return {
      bookingId: booking.bookingId || booking.id,
      status: "pending",
      stripeCheckoutUrl: stripeSession.url,
    }
  } catch (error) {
    console.error("Booking creation error:", error)
    throw error
  }
}

function calculateTotalAmount(bookingData: {
  startDate: string
  endDate: string
  guests: number
  propertyId: string
}): number {
  // Simple calculation - in production would use pricing engine
  const start = new Date(bookingData.startDate)
  const end = new Date(bookingData.endDate)
  const nights = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  )

  const baseRate = bookingData.propertyId === "villa-bruno" ? 115 : 150
  const total = baseRate * nights

  return total * 100 // Convert to cents for Stripe
}
