"use client"
import { useDialog } from "../app/providers/DialogProvider"
import { calculateTotalWithRules } from "../lib/calculateTotal"
import { getInternationalizedValue, titleCase } from "../lib/utils"
import { BOOKING_TYPE, BookingType } from "../types"
import { PricingRule } from "../lib/pricingEngine"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

const PriceCalculation = ({
  pricingRules,
  guests,
  bookingType,
  locale,
  t,
  duration,
  currency: currencyProp = "USD",
  checkInDate,
}: {
  pricingRules?: PricingRule[]
  guests: number
  bookingType: BookingType
  locale: string
  duration?: number
  currency?: string
  checkInDate?: Date
  t?: Record<string, any> &
    ((key: string, values?: Record<string, any>) => string)
}) => {
  const { dialogData: dialog } = useDialog()
  const b = useTranslations("booking")
  // Calculate total using pricing rules or fallback
  const { priceForPeople, priceWithVat, total } =
    pricingRules && pricingRules.length > 0
      ? calculateTotalWithRules({
          pricingRules,
          guests,
          bookingType,
          duration,
          checkInDate:
            checkInDate ||
            (bookingType === BOOKING_TYPE.villa ? new Date() : undefined),
        })
      : { priceForPeople: 0, priceWithVat: 0, total: 0 }

  // Calculate totals for the entire stay
  const totalWithoutVat = priceForPeople * (duration || 1)
  const totalVatAmount = totalWithoutVat * 0.13 // 13% VAT rate
  const totalWithVat = totalWithoutVat + totalVatAmount

  const currency = (toFormat: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyProp,
    })
      .format(toFormat)
      .trim()

  const discountAmount =
    duration && duration >= 7 && pricingRules
      ? (() => {
          // Find the best discount rule (highest percentage) that applies to this duration
          const bestDiscountRule = pricingRules.reduce(
            (best: PricingRule | null, current) => {
              if (
                current.ruleType === "discount" &&
                current.minimumNights &&
                duration >= current.minimumNights &&
                current.percentage
              ) {
                return !best || current.percentage > (best.percentage || 0)
                  ? current
                  : best
              }
              return best
            },
            null,
          )

          return bestDiscountRule && bestDiscountRule.percentage
            ? (totalWithVat * bestDiscountRule.percentage) / 100
            : 0
        })()
      : 0

  const finalTotal = totalWithVat - discountAmount

  const discountPercentage =
    duration !== null && duration !== undefined && duration >= 28
      ? b("discount20", {
          discount:
            pricingRules?.find(
              rule =>
                rule.ruleType === "discount" &&
                rule.minimumNights &&
                duration >= rule.minimumNights,
            )?.percentage || 20,
        })
      : duration !== null && duration !== undefined && duration >= 7
        ? b("discount10", {
            discount:
              pricingRules?.find(
                rule =>
                  rule.ruleType === "discount" &&
                  rule.minimumNights &&
                  duration >= rule.minimumNights,
              )?.percentage || 10,
          })
        : ""

  const totalDisplayed =
    bookingType === BOOKING_TYPE.villa
      ? `${getInternationalizedValue(dialog?.total, locale, "Total")} ${duration ? `for ${duration} nights` : null}`
      : getInternationalizedValue(dialog?.total, locale, "Total")

  return (
    <div className="grid gap-2 flex-none w-full">
      <dl className="grid grid-cols-2 items-center justify-between">
        <dt className="text-muted-foreground">
          {b("totalWithoutVat", {
            guests,
            guestsLabel: b(guests === 1 ? "person" : "people"),
            nights: duration ? `${duration} nights` : "",
          })}
        </dt>
        <dd className="text-right">{currency(totalWithoutVat)}</dd>
        <dt className="text-muted-foreground">
          {b("totalVat", {
            guests,
            guestsLabel: b(guests === 1 ? "person" : "people"),
            nights: duration ? `${duration} nights` : "",
          })}
        </dt>
        <dd className="text-right">{currency(totalVatAmount)}</dd>

        {discountAmount > 0 && (
          <>
            <dt className="text-muted-foreground">{discountPercentage}</dt>
            <dd className="text-right">-{currency(discountAmount)}</dd>
          </>
        )}
      </dl>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>{titleCase(totalDisplayed)}</span>
        <span>{currency(finalTotal)}</span>
      </div>
    </div>
  )
}
export default PriceCalculation
