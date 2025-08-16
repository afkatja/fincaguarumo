"use client"
import { useDialog } from "../app/[locale]/DialogProvider"
import calculateTotal from "../lib/calculateTotal"
import { getInternationalizedValue, titleCase } from "../lib/utils"
import { BOOKING_TYPE, BookingType } from "../types"
import { Separator } from "@/components/ui/separator"

const PriceCalculation = ({
  price,
  guests,
  bookingType,
  locale,
  t,
  duration,
  currency: currencyProp = "USD",
}: {
  price: number
  guests: number
  bookingType: BookingType
  locale: string
  duration?: number
  currency?: string
  t: Record<string, string> | undefined
}) => {
  const { dialogData: dialog } = useDialog()

  const { priceForPeople, total } = calculateTotal(
    price,
    guests,
    bookingType,
    duration
  )

  const currency = (toFormat: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyProp,
    })
      .format(toFormat)
      .trim()

  const totalDisplayed =
    bookingType === BOOKING_TYPE.villa
      ? `${getInternationalizedValue(dialog?.total, locale, "Total")} ${duration ? `for ${duration} nights` : null}`
      : getInternationalizedValue(dialog?.total, locale, "Total")

  return (
    <div className="grid gap-2 flex-none w-full">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          {bookingType === BOOKING_TYPE.villa
            ? `${t?.priceLabel} ${guests} 
          ${getInternationalizedValue(
            guests === 1 ? dialog?.person : dialog?.people,
            locale,
            "people"
          )}`
            : t?.rateLabel || "Price"}
        </span>
        <span>{currency(priceForPeople)}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>{titleCase(totalDisplayed)}</span>
        <span>{currency(total)}</span>
      </div>
    </div>
  )
}
export default PriceCalculation
