import { BookingType, IBookingType } from "../types"

const calculateTotal = (
  price: string,
  guests: string,
  bookingType: BookingType,
  duration?: number
) => {
  if (bookingType === IBookingType.tour) {
    return parseInt(price) * parseInt(guests)
  } else {
    // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
    const basePrice = parseInt(price)
    const additionalGuests = Math.min(parseInt(guests) - 1, 3) // Max 3 additional guests
    const additionalPrice = additionalGuests * 20
    const stay = duration ?? 1
    return (basePrice + additionalPrice) * stay // Default duration is 1 if not provided
  }
}

export default calculateTotal
