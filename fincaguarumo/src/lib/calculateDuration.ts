import { differenceInDays } from "date-fns"
import parseLocalizedDate from "./parseLocalizedDate"

const calculateDuration = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 0

  try {
    const checkInDate = parseLocalizedDate(checkIn)
    const checkOutDate = parseLocalizedDate(checkOut)

    // Check if dates are valid
    if (!checkInDate || !checkOutDate) {
      return 0
    }

    // Calculate the difference in days using date-fns
    const nights = differenceInDays(checkOutDate, checkInDate)

    return Math.max(0, nights) // Return 0 if negative
  } catch (error) {
    console.error("Error calculating duration:", error)
    return 0
  }
}
export default calculateDuration
