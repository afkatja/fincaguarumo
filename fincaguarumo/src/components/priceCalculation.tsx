"use client"
import { useDialog } from "../app/[locale]/DialogProvider"
import calculateTotal from "../lib/calculateTotal"
import { getInternationalizedValue, titleCase } from "../lib/utils"
import { BookingType } from "../types"
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

  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyProp,
  })
    .format(1)
    .replace(/\d/g, "")
    .trim()

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
        <span>
          {currency} {priceForPeople}
        </span>
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>
          {titleCase(getInternationalizedValue(dialog?.total, locale, "Total"))}
        </span>
        <span>
          {currency} {total}
        </span>
      </div>
    </div>
  )
}
export default PriceCalculation
