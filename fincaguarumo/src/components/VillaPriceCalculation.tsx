import { formatCurrency, createCurrencyFormatter } from "../lib/currency"
import { calculateTotalWithRules } from "../lib/calculateTotal"
import { getVatRate, getVatAmount } from "../lib/pricingEngine"
import { titleCase } from "../lib/utils"
import { PricingRule } from "../lib/pricingEngine"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { BOOKING_TYPE } from "../types"
import { useVillaBooking } from "../app/providers/VillaBookingProvider"
import { useEffect, useRef, useState, useMemo } from "react"
import Loading from "../app/[locale]/loading"

interface PricingCalculations {
  priceForPeople: number
  total: number
  baseTotal: number
  discountAmount: number
  subtotalBeforeVat: number
  vatAmount: number
  vatRate: number
  discountRule?: PricingRule
}

interface VillaPriceCalculationProps {
  guests: number
  locale: string
  duration: number
  currency?: string
  checkInDate?: Date
  t?: Record<string, any> &
    ((key: string, values?: Record<string, any>) => string)
}

const VillaPriceCalculation = ({
  guests,
  locale,
  duration,
  currency: currencyProp = "USD",
  checkInDate,
}: VillaPriceCalculationProps) => {
  const b = useTranslations("booking")
  const { fetchVillaPricingRules } = useVillaBooking()
  const [loading, setLoading] = useState(false)
  const pricingRulesRef = useRef<PricingRule[] | null>(null)

  useEffect(() => {
    if (pricingRulesRef.current) return
    const getPricingRules = async () => {
      try {
        setLoading(true)
        const pricingRules = await fetchVillaPricingRules()
        pricingRulesRef.current = pricingRules
      } catch (err) {
        console.error("Error fetching villa pricing rules:", err)
      } finally {
        setLoading(false)
      }
    }
    getPricingRules()
  }, [fetchVillaPricingRules]) // Add missing dependency

  // Memoize currency formatter to prevent recreation on every render
  const currency = useMemo(
    () =>
      createCurrencyFormatter({
        locale,
        currency: currencyProp,
        minimumFractionDigits: 0,
      }),
    [locale, currencyProp],
  )
  // Memoize pricing calculations
  const pricingCalculations = useMemo(() => {
    if (!pricingRulesRef.current || pricingRulesRef.current.length === 0) {
      return {
        priceForPeople: 0,
        total: 0,
        baseTotal: 0,
        discountAmount: 0,
        subtotalBeforeVat: 0,
        vatAmount: 0,
        vatRate: 0,
        discountRule: undefined,
      }
    }

    const { priceForPeople, total } = calculateTotalWithRules({
      pricingRules: pricingRulesRef.current,
      guests,
      bookingType: BOOKING_TYPE.villa,
      duration,
      checkInDate: checkInDate || new Date(),
    })

    // Find discount information for display (if any)
    const discountRule = pricingRulesRef.current.find(
      rule =>
        rule.ruleType === "discount" &&
        rule.minimumNights &&
        duration >= rule.minimumNights,
    )

    const vatRate = getVatRate(pricingRulesRef.current)
    const baseTotal = priceForPeople * duration // Base calculation: guests x nights
    const discountAmount = discountRule?.percentage
      ? (baseTotal * discountRule.percentage) / 100
      : 0
    const subtotalBeforeVat = baseTotal - discountAmount
    const vatAmount = subtotalBeforeVat * vatRate

    return {
      priceForPeople,
      total,
      baseTotal,
      discountAmount,
      subtotalBeforeVat,
      vatAmount,
      vatRate,
      discountRule,
    }
  }, [guests, duration, checkInDate, pricingRulesRef.current])

  // Memoize discount percentage text
  const discountPercentage = useMemo(() => {
    const { discountRule } = pricingCalculations
    if (!discountRule?.percentage) return ""

    return duration >= 28
      ? b("discount20", { discount: discountRule.percentage })
      : duration >= 7
        ? b("discount10", { discount: discountRule.percentage })
        : ""
  }, [pricingCalculations, duration, b])

  const totalDisplayed = b("totalDisplayedVilla", { nights: duration })

  if (loading) return <Loading />
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
        <dd className="text-right">
          {currency(pricingCalculations.baseTotal)}
        </dd>

        {pricingCalculations.discountAmount > 0 && (
          <>
            <dt className="text-muted-foreground">{discountPercentage}</dt>
            <dd className="text-right">
              -{currency(pricingCalculations.discountAmount)}
            </dd>
            <dt className="text-muted-foreground">Subtotal (before VAT)</dt>
            <dd className="text-right">
              {currency(pricingCalculations.subtotalBeforeVat)}
            </dd>
          </>
        )}

        <dt className="text-muted-foreground">
          VAT {Math.round(pricingCalculations.vatRate * 100)}%
        </dt>
        <dd className="text-right">
          {currency(pricingCalculations.vatAmount)}
        </dd>
      </dl>
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>{titleCase(totalDisplayed)}</span>
        <span>{currency(pricingCalculations.total)}</span>
      </div>
    </div>
  )
}

export default VillaPriceCalculation
