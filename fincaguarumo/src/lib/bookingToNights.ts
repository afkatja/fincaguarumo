export default function bookingToNights(start: Date, end: Date) {
  const nights: Date[] = []
  const cur = new Date(start)
  while (cur < end) {
    nights.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return nights
}
