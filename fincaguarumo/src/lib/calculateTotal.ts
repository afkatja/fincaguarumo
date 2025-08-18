import { BookingType, BOOKING_TYPE } from "../types"

export const EXTRA_GUEST_FEE = 20
export const MAX_EXTRA_GUESTS = 4

const calculateTotal = (
  price: number,
  guests: number,
  bookingType: BookingType,
  duration?: number
) => {
  // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
  const priceForPeople =
    price + Math.min(guests - 1, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE

  if (bookingType === BOOKING_TYPE.tour) {
    return { priceForPeople: price, total: price * guests }
  } else {
    const stay = duration ?? 1
    // apply a discount for longer stays
    if (stay >= 7) {
      // 10% discount
      return { priceForPeople, total: priceForPeople * stay * 0.9 }
    }
    if (stay >= 30) {
      // 20% discount
      return { priceForPeople, total: priceForPeople * stay * 0.8 }
    }
    // no discount
    return { priceForPeople, total: priceForPeople * stay }
  }
}

export default calculateTotal
