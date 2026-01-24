import { normalizeToNoon } from "./dateUtils"

export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []

  // Normalize dates to noon to avoid timezone and daylight saving issues
  const startNormalized = normalizeToNoon(start)
  const endNormalized = normalizeToNoon(end)

  while (startNormalized < endNormalized) {
    nights.push(new Date(startNormalized))
    startNormalized.setDate(startNormalized.getDate() + 1)
  }
  return nights
}
