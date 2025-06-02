import { BookingType, IBookingType } from "../types"
import { Separator } from "@/components/ui/separator"

export const calculateTotal = (
  price: number,
  guests: number,
  bookingType: BookingType
) => {
  if (bookingType === IBookingType.tour) {
    return Number(price) * Number(guests)
  } else {
    // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
    const basePrice = Number(price)
    const additionalGuests = Math.min(Number(guests) - 1, 3) // Max 3 additional guests
    const additionalPrice = additionalGuests * 20
    return basePrice + additionalPrice
  }
}

const PriceCalculation = ({
  price,
  guests,
  bookingType,
}: {
  price: number
  guests: number
  bookingType: BookingType
}) => {
  const total = calculateTotal(price, guests, bookingType)

  return (
    <div className="grid gap-2 flex-none w-full">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">Price for {guests} people</div>
        <div>${total}</div>
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <div>Total</div>
        <div>${total}</div>
      </div>
    </div>
  )
}
export default PriceCalculation
