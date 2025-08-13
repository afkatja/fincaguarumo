"use client"
import { useDialog } from "../app/[locale]/DialogProvider"
import calculateTotal from "../lib/calculateTotal"
import { getInternationalizedValue, titleCase } from "../lib/utils"
import { BookingType, BOOKING_TYPE } from "../types"
import { Separator } from "@/components/ui/separator"

const PriceCalculation = ({
  price,
  guests,
  bookingType,
  locale,
  t,
  duration,
}: {
  price: number
  guests: number
  bookingType: BookingType
  locale: string
  duration?: number
  t: Record<string, string> | undefined
}) => {
  const { dialogData: dialog } = useDialog()
  const parsedPrice = price
  const parsedGuests = guests

  if (isNaN(parsedPrice) || isNaN(parsedGuests)) {
    console.error("Invalid price or guests value", { price, guests })
    return null
  }

  const priceForPeople =
    bookingType === BOOKING_TYPE.villa
      ? parsedPrice + Math.min(parsedGuests - 1, 3) * 20
      : parsedPrice * parsedGuests

  const total = calculateTotal(price, guests, bookingType, duration)

  return (
    <div className="grid gap-2 flex-none w-full">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          {t?.priceLabel} {guests}{" "}
          {getInternationalizedValue(
            Number(guests) === 1 ? dialog?.person : dialog?.people,
            locale,
            "people"
          )}
        </span>
        <span>${priceForPeople}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>
          {titleCase(getInternationalizedValue(dialog?.total, locale, "Total"))}
        </span>
        <span>${total}</span>
      </div>
    </div>
  )
}
export default PriceCalculation
