export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []

  // Start from the day after check-in
  const cur = new Date(start)
  cur.setUTCDate(cur.getUTCDate() + 1)

  // End at the day of check-out
  const checkoutExclusive = new Date(end)

  while (cur < checkoutExclusive) {
    nights.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return nights
}
