export default function bookingToNights(startIso: string, endIso: string) {
  const nights: string[] = []
  const cur = new Date(startIso)
  const end = new Date(endIso)
  while (cur <= end) {
    nights.push(cur.toISOString().slice(0, 10)) // 'YYYY-MM-DD'
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return nights
}
