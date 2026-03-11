import { formatCurrency, createCurrencyFormatter } from "../lib/currency"
import { calculateTotalWithRules } from "../lib/calculateTotal"
import { getVatRate } from "../lib/pricingEngine"
import { titleCase } from "../lib/utils"
import { PricingRule } from "../lib/pricingEngine"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { BOOKING_TYPE } from "../types"

interface VillaPriceCalculationProps {
  pricingRules?: PricingRule[]
  guests: number
  locale: string
  duration: number
  currency?: string
  checkInDate?: Date
  t?: Record<string, any> &
    ((key: string, values?: Record<string, any>) => string)
}

const VillaPriceCalculation = ({
  pricingRules,
  guests,
  locale,
  duration,
  currency: currencyProp = "USD",
  checkInDate,
  t,
}: VillaPriceCalculationProps) => {
  const b = useTranslations("booking")

  // Calculate total using pricing rules or fallback - the engine handles all calculations
  const { priceForPeople, total } =
    pricingRules && pricingRules.length > 0
      ? calculateTotalWithRules({
          pricingRules,
          guests,
          bookingType: BOOKING_TYPE.villa,
          duration,
          checkInDate: checkInDate || new Date(),
        })
      : { priceForPeople: 0, total: 0 }

  const currency = createCurrencyFormatter({
    locale,
    currency: currencyProp,
    minimumFractionDigits: 0,
  })

  // Find discount information for display (if any)
  const discountRule = pricingRules?.find(
    rule =>
      rule.ruleType === "discount" &&
      rule.minimumNights &&
      duration >= rule.minimumNights,
  )
  const vatRate = getVatRate(pricingRules || [])
  const totalWithoutDiscount = priceForPeople * duration * (1 + vatRate)
  const discountAmount = discountRule?.percentage
    ? (totalWithoutDiscount * discountRule.percentage) / 100
    : 0

  const discountPercentage =
    duration >= 28
      ? b("discount20", {
          discount: discountRule?.percentage || 20,
        })
      : duration >= 7
        ? b("discount10", {
            discount: discountRule?.percentage || 10,
          })
        : ""

  const totalDisplayed = b("totalDisplayedVilla", {
    nights: duration,
  })

  return (
    <div className="grid gap-2 flex-none w-full">
      <dl className="grid grid-cols-2 items-center justify-between">
        <dt className="text-muted-foreground">
          {b("totalWithoutVat", {
            guests,
            guestsLabel: b(guests === 1 ? "person" : "people"),
            nights: `${duration} nights`,
          })}
        </dt>
        <dd className="text-right">{currency(priceForPeople * duration)}</dd>
        <dt className="text-muted-foreground">
          {b("totalVat", {
            guests,
            guestsLabel: b(guests === 1 ? "person" : "people"),
            nights: `${duration} nights`,
          })}
        </dt>
        <dd className="text-right">
          {currency(priceForPeople * duration * vatRate)}
        </dd>

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
        <span>{currency(total)}</span>
      </div>
    </div>
  )
}

export default VillaPriceCalculation
