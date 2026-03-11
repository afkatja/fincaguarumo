import { formatCurrency, createCurrencyFormatter } from "../lib/currency"
import { calculateTotalWithRules } from "../lib/calculateTotal"
import { titleCase } from "../lib/utils"
import { PricingRule } from "../lib/pricingEngine"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { BOOKING_TYPE } from "../types"

interface TourPriceCalculationProps {
  price: number
  guests: number
  locale: string
  currency?: string
  t?: Record<string, any> &
    ((key: string, values?: Record<string, any>) => string)
}

const TourPriceCalculation = ({
  price,
  guests,
  locale,
  currency: currencyProp = "USD",
  t,
}: TourPriceCalculationProps) => {
  const b = useTranslations("booking")

  // Create pricing rule for tour base price
  const tourPricingRule: PricingRule = {
    _id: "tourBasePrice",
    title: "Tour base price",
    ruleType: "base_rate",
    basePrice: price,
    description: "Tour base price",
    language: locale,
    isActive: true,
  }

  // Calculate total using pricing rules - the engine handles all calculations
  const { priceForPeople, priceWithVat, total } = calculateTotalWithRules({
    pricingRules: [tourPricingRule],
    guests,
    bookingType: BOOKING_TYPE.tour,
  })

  const currency = createCurrencyFormatter({
    locale,
    currency: currencyProp,
  })

  const totalDisplayed = b("totalDisplayedTour", {
    guests: guests,
    guestsLabel: guests === 1 ? b("person") : b("people"),
  })

  return (
    <div className="grid gap-2 flex-none w-full">
      <dl className="grid grid-cols-2 items-center justify-between">
        <dt className="text-muted-foreground">{b("rateLabel")}</dt>
        <dd className="text-right">{currency(priceForPeople)}</dd>
        <dt className="text-muted-foreground">{b("vatLabel")}</dt>
        <dd className="text-right">
          {currency(priceWithVat - priceForPeople)}
        </dd>
      </dl>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>{titleCase(totalDisplayed)}</span>
        <span>{currency(total)}</span>
      </div>
    </div>
  )
}

export default TourPriceCalculation
