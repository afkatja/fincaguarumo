import { BookingType, BOOKING_TYPE } from "../types"

export const EXTRA_GUEST_FEE = 20
export const MAX_EXTRA_GUESTS = 3

const calculateTotal = (
  price: number,
  guests: number,
  bookingType: BookingType,
  duration?: number
) => {
  const priceForPeople =
    bookingType === BOOKING_TYPE.villa
      ? price + Math.min(guests - 1, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE
      : price * guests

  if (bookingType === BOOKING_TYPE.tour) {
    return { priceForPeople, total: price * guests }
  } else {
    // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
    const basePrice = price
    const additionalGuests = Math.min(guests - 1, 3) // Max 3 additional guests
    const additionalPrice = additionalGuests * 20
    const stay = duration ?? 1
    return { priceForPeople, total: (basePrice + additionalPrice) * stay } // Default duration is 1 if not provided
  }
}

export default calculateTotal
