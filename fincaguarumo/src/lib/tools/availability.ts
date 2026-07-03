export async function checkAvailability({
  checkIn,
  checkOut,
}: {
  checkIn: string
  checkOut: string
}) {
  try {
    // Reuse existing logic from src/app/api/ical/merged/route.ts
    const response = await fetch("/api/availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ checkIn, checkOut }),
    })

    if (!response.ok) {
      throw new Error("Availability check failed")
    }

    const result = await response.json()

    // Ensure the response has the expected structure
    return {
      available: result.available || false,
      blockedDates: result.blockedDates || [],
      alternatives: result.alternatives || [],
      pricing: result.pricing || null,
    }
  } catch (error) {
    console.error("Availability check error:", error)
    return {
      available: false,
      blockedDates: [],
      alternatives: [],
      pricing: null,
    }
  }
}
