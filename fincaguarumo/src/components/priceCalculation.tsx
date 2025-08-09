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
}: {
  price: string
  guests: string
  bookingType: BookingType
  locale: string
  duration?: number
  t: Record<string, string> | undefined
}) => {
  const total = calculateTotal(price, guests, bookingType, duration)
  const { dialogData: dialog } = useDialog()
  return (
    <div className="grid gap-2 flex-none w-full">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">
          {t?.priceLabel} {guests}{" "}
          {getInternationalizedValue(
            Number(guests) === 1 ? dialog?.person : dialog?.people,
            locale,
            "people"
          )}
        </div>
        <div>${price + Math.min(parseInt(guests) - 1, 3) * 20}</div>
      </div>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <div>
          {titleCase(getInternationalizedValue(dialog?.total, locale, "Total"))}
        </div>
        <div>${total}</div>
      </div>
    </div>
  )
}
export default PriceCalculation
