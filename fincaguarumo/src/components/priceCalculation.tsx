"use client"
import { useDialog } from "../app/[locale]/DialogProvider"
import { getInternationalizedValue } from "../lib/utils"
import { BookingType, IBookingType } from "../types"
import { Separator } from "@/components/ui/separator"

export const calculateTotal = (
  price: string,
  guests: string,
  bookingType: BookingType
) => {
  if (bookingType === IBookingType.tour) {
    return parseInt(price) * parseInt(guests)
  } else {
    // Villa pricing: base price for 1 person, +$20 for each additional person up to 4
    const basePrice = parseInt(price)
    const additionalGuests = Math.min(parseInt(guests) - 1, 3) // Max 3 additional guests
    const additionalPrice = additionalGuests * 20
    return basePrice + additionalPrice
  }
}

const PriceCalculation = ({
  price,
  guests,
  bookingType,
  locale,
}: {
  price: string
  guests: string
  bookingType: BookingType
  locale: string
}) => {
  const total = calculateTotal(price, guests, bookingType)
  const { dialogData: dialog } = useDialog()
  return (
    <div className="grid gap-2 flex-none w-full">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">
          Price for {guests}{" "}
          {getInternationalizedValue(dialog?.people, locale, "people")}
        </div>
        <div>${total}</div>
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <div> {getInternationalizedValue(dialog?.total, locale, "Total")}</div>
        <div>${total}</div>
      </div>
    </div>
  )
}
export default PriceCalculation
