import { formatCurrency, createCurrencyFormatter } from "../lib/currency"
import { AccommodationContent } from "@/app/[locale]/(pages)/villa-bruno/page"
import Icon from "./Icon"
import { useTranslations } from "next-intl"
import { DollarSign, HomeIcon, User2Icon } from "lucide-react"

interface QuickInfoBarProps {
  content: AccommodationContent
  price: number
  guests: number
}

export const QuickInfoBar = ({ content, price, guests }: QuickInfoBarProps) => {
  const t = useTranslations("accommodation")
  const b = useTranslations("booking")
  const formatPrice = createCurrencyFormatter({
    locale: "en-US",
    currency: "USD",
    minimumFractionDigits: 0,
  })

  return (
    <div className="rounded-lg p-4 md:p-6 border border-guarumo-primary/20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Price */}
        <div className="flex flex-col items-center text-center p-3 md:p-4 bg-zinc-50/50 rounded-lg min-h-0">
          <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-guarumo-primary mb-1 md:mb-2 shrink-0" />
          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-tight">
            {t("from")}
          </span>
          <span className="text-lg md:text-2xl font-bold text-guarumo-primary dark:text-zinc-50 leading-tight">
            {formatPrice(price)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {b("priceFromShort", {
              guests: 1,
              guestsLabel: b("person"),
            })}
          </span>
        </div>

        {/* Capacity */}
        <div className="flex flex-col items-center text-center p-3 md:p-4 bg-zinc-50/50 rounded-lg min-h-0">
          <User2Icon className="h-6 w-6 md:h-8 md:w-8 text-guarumo-primary mb-1 md:mb-2 flex-shrink-0" />
          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-tight">
            {t("capacity")}
          </span>
          <span className="text-lg md:text-2xl font-bold text-guarumo-primary dark:text-zinc-50 leading-tight">
            {content.capacity || 4}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {t("guests")}
          </span>
        </div>

        {/* Property Type */}
        <div className="flex flex-col items-center text-center p-3 md:p-4 bg-zinc-50/50 rounded-lg min-h-0">
          <HomeIcon className="h-6 w-6 md:h-8 md:w-8 text-guarumo-primary mb-1 md:mb-2 flex-shrink-0" />
          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-tight">
            {t("type")}
          </span>
          <span className="text-sm md:text-lg font-bold text-guarumo-primary dark:text-zinc-50 capitalize leading-tight">
            {content.propertyType || "Villa"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {content.bedrooms || 1} {t("bed")}, {content.bathrooms || 1}{" "}
            {t("bath")}
          </span>
        </div>

        {/* Location */}
        <div className="flex flex-col items-center text-center p-3 md:p-4 bg-zinc-50/50 rounded-lg min-h-0">
          <Icon
            icon="Pin"
            className="h-6 w-6 md:h-8 md:w-8 text-guarumo-primary mb-1 md:mb-2 flex-shrink-0"
          />
          <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-tight">
            {t("location")}
          </span>
          <span className="text-sm md:text-lg font-bold text-guarumo-primary dark:text-zinc-50 leading-tight">
            {content.location?.city || "Puerto Jiménez"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
            {content.location?.country || "Costa Rica"}
          </span>
        </div>
      </div>

      {/* Check-in/Check-out Times */}
      <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-guarumo-primary/20 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-8 text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <Icon
            icon="Clock"
            className="h-3 w-3 md:h-4 md:w-4 text-guarumo-primary flex-shrink-0"
          />
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {t("checkIn")}:
          </span>
          <span className="font-medium text-guarumo-primary dark:text-zinc-50 whitespace-nowrap">
            {content.checkInTime || "3:00 PM"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Icon
            icon="Clock"
            className="h-3 w-3 md:h-4 md:w-4 text-guarumo-primary flex-shrink-0"
          />
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {t("checkOut")}:
          </span>
          <span className="font-medium text-guarumo-primary dark:text-zinc-50 whitespace-nowrap">
            {content.checkOutTime || "11:00 AM"}
          </span>
        </div>
      </div>
    </div>
  )
}
