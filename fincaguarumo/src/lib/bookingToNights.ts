import { normalizeToNoon } from "./dateUtils"

export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []

  // Normalize dates to noon to avoid timezone and daylight saving issues
  const startNormalized = normalizeToNoon(start)
  const endNormalized = normalizeToNoon(end)

  // Start from the check-in day
  const cur = new Date(startNormalized)

  // End at the day of check-out inclusive
  const checkoutInclusive = new Date(endNormalized)

  while (cur <= checkoutInclusive) {
    nights.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return nights
}
