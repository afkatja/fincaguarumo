export async function checkAvailability({
  checkIn,
  checkOut,
}: {
  checkIn: string
  checkOut: string
}) {
  // Reuse existing logic from src/app/api/ical/merged/route.ts
  const response = await fetch("/api/availability", {
    method: "POST",
    body: JSON.stringify({ checkIn, checkOut }),
  })

  return response.json()
}
