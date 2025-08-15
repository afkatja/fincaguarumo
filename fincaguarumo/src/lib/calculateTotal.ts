import { BookingType, BOOKING_TYPE } from "../types"

export const EXTRA_GUEST_FEE = 20
export const MAX_EXTRA_GUESTS = 3

const calculateTotal = (
  price: number,
  guests: number,
  bookingType: BookingType,
  duration?: number
) => {
  // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
  const priceForPeople =
    bookingType === BOOKING_TYPE.villa
      ? price + Math.min(guests - 1, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE
      : price * guests

  if (bookingType === BOOKING_TYPE.tour) {
    return { priceForPeople, total: price * guests }
  } else {
    const stay = duration ?? 1
    return { priceForPeople, total: priceForPeople * stay }
  }
}

export default calculateTotal
