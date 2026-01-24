import { normalizeToNoon } from "./dateUtils"

export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []

  // Normalize dates to noon to avoid timezone and daylight saving issues
  const startNormalized = normalizeToNoon(start)
  const endNormalized = normalizeToNoon(end)

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
