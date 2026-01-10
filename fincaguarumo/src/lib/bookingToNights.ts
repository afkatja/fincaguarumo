export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []

  // Start from the day after check-in (check-out/check-in day)
  const cur = new Date(start)
  cur.setUTCDate(cur.getUTCDate())

  // End at the day before check-out (check-out/check-in day)
  const checkoutExclusive = new Date(end)
  checkoutExclusive.setUTCDate(checkoutExclusive.getUTCDate() - 1)

  while (cur <= checkoutExclusive) {
    nights.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return nights
}
