export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []

  // Normalize dates to noon to avoid timezone and daylight saving issues
  const startNormalized = new Date(start)
  startNormalized.setHours(12, 0, 0, 0)
  const endNormalized = new Date(end)
  endNormalized.setHours(12, 0, 0, 0)

  // Start from the day after check-in
  const cur = new Date(startNormalized)
  cur.setDate(cur.getDate() + 1)

  // End at the day of check-out
  const checkoutExclusive = new Date(endNormalized)

  while (cur < checkoutExclusive) {
    nights.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return nights
}
