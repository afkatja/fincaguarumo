import { BookingType, BOOKING_TYPE } from "../types"

export const EXTRA_GUEST_FEE = 20
export const MAX_EXTRA_GUESTS = 4

const calculateTotal = (
  price: number,
  guests: number,
  bookingType: BookingType,
  duration?: number,
) => {
  const priceWithoutVat = price / 1.13
  // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
  const priceForPeople =
    priceWithoutVat + Math.min(guests - 1, MAX_EXTRA_GUESTS) * EXTRA_GUEST_FEE

  if (bookingType === BOOKING_TYPE.tour) {
    return {
      priceForPeople: priceWithoutVat,
      priceWithVat: priceWithoutVat * 1.13,
      total: priceWithoutVat * 1.13 * guests,
    }
  } else {
    const stay = duration ?? 1
    // apply a discount for longer stays
    if (stay >= 7) {
      // 13% discount
      return {
        priceForPeople,
        priceWithVat: priceForPeople * 1.13,
        total: priceForPeople * 1.13 * stay * 0.87,
      }
    }
    if (stay >= 28) {
      // 33% discount
      return {
        priceForPeople,
        priceWithVat: priceForPeople * 1.13,
        total: priceForPeople * 1.13 * stay * 0.67,
      }
    }
    // no discount
    return {
      priceForPeople,
      priceWithVat: priceForPeople * 1.13,
      total: priceForPeople * 1.13 * stay,
    }
  }
}

export default calculateTotal
