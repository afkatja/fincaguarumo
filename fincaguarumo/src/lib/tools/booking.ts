export async function createBooking(bookingData: any) {
  // Migrate existing Sanity logic to Supabase
  const response = await fetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify(bookingData),
  })

  return response.json()
}
