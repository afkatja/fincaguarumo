import { differenceInDays } from "date-fns"

const calculateDuration = (checkIn: Date, checkOut: Date): number => {
  if (!checkIn || !checkOut) return 0

  try {
    // Check if dates are valid
    if (!checkIn || !checkOut) {
      return 0
    }

    // Calculate the difference in days using date-fns
    const nights = differenceInDays(checkOut, checkIn)

    return Math.max(0, nights) // Return 0 if negative
  } catch (error) {
    console.error("Error calculating duration:", error)
    return 0
  }
}
export default calculateDuration
