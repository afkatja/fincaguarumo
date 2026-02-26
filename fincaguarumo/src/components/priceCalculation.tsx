"use client"
import { useDialog } from "../app/providers/DialogProvider"
import { calculateTotalWithRules } from "../lib/calculateTotal"
import { getInternationalizedValue, titleCase } from "../lib/utils"
import { BOOKING_TYPE, BookingType } from "../types"
import { PricingRule } from "../lib/pricingEngine"
import { Separator } from "@/components/ui/separator"

const PriceCalculation = ({
  pricingRules,
  guests,
  bookingType,
  locale,
  t,
  duration,
  currency: currencyProp = "USD",
}: {
  pricingRules?: PricingRule[]
  guests: number
  bookingType: BookingType
  locale: string
  duration?: number
  currency?: string
  t?: Record<string, any> &
    ((key: string, values?: Record<string, any>) => string)
}) => {
  const { dialogData: dialog } = useDialog()

  // Calculate total using pricing rules or fallback
  const { priceForPeople, priceWithVat, total } =
    pricingRules && pricingRules.length > 0
      ? calculateTotalWithRules({
          pricingRules,
          guests,
          bookingType,
          duration,
          checkInDate:
            bookingType === BOOKING_TYPE.villa ? new Date() : undefined,
        })
      : { priceForPeople: 0, priceWithVat: 0, total: 0 }

  const discountAmount =
    duration && duration >= 7
      ? priceWithVat * duration * (duration >= 28 ? 0.2 : 0.1)
      : 0

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
      <dl className="grid grid-cols-2 items-center justify-between">
        <dt className="text-muted-foreground">
          {bookingType === BOOKING_TYPE.villa
            ? `${t?.("priceLabel")} ${guests}
          ${getInternationalizedValue(
            guests === 1 ? dialog?.person : dialog?.people,
            locale,
            "people",
          )}`
            : t?.("rateLabel", { defaultValue: "Price" })}
        </dt>
        <dd className="text-right">{currency(priceForPeople)}</dd>
        <dt className="text-muted-foreground">
          {t?.("rateVATlabel", { defaultValue: "Price (incl 13% VAT)" })}
        </dt>
        <dd className="text-right">{currency(priceWithVat)}</dd>
        {discountAmount > 0 && (
          <>
            <dt className="text-muted-foreground">
              {(duration! >= 28 ? t?.discount20 : t?.discount10) ||
                (duration! >= 28
                  ? "Discount (20% for stays 28+ nights)"
                  : "Discount (10% for stays 7+ nights)")}
            </dt>
            <dd className="text-right">-{currency(discountAmount)}</dd>
          </>
        )}
      </dl>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>{titleCase(totalDisplayed)}</span>
        <span>{currency(total)}</span>
      </div>
    </div>
  )
}
export default PriceCalculation
