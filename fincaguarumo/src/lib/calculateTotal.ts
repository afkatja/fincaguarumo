import { BookingType, BOOKING_TYPE } from "../types"

const calculateTotal = (
  price: number,
  guests: number,
  bookingType: BookingType,
  duration?: number
) => {
  if (bookingType === BOOKING_TYPE.tour) {
    return price * guests
  } else {
    // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
    const basePrice = price
    const additionalGuests = Math.min(guests - 1, 3) // Max 3 additional guests
    const additionalPrice = additionalGuests * 20
    const stay = duration ?? 1
    return (basePrice + additionalPrice) * stay // Default duration is 1 if not provided
  }
}

export default calculateTotal
