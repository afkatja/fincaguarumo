"use client"
import { AccommodationContent } from "@/app/[locale]/(pages)/stay/page"
import Icon from "./Icon"
import { Badge } from "./ui/badge"
import { useTranslations } from "next-intl"

interface QuickInfoBarProps {
  content: AccommodationContent
  price: number
  guests: number
}

export const QuickInfoBar = ({ content, price, guests }: QuickInfoBarProps) => {
  const t = useTranslations("accommodation")
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="w-11/12 mx-auto my-6 bg-linear-to-r from-guarumo-primary/10 to-guarumo-accent/10 rounded-lg p-6 border border-guarumo-primary/20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Price */}
        <div className="flex flex-col items-center text-center p-4 bg-white/50 rounded-lg">
          <Icon
            icon="DollarSign"
            className="h-8 w-8 text-guarumo-primary mb-2"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("from") || "From"}
          </span>
          <span className="text-2xl font-bold text-guarumo-primary dark:text-zinc-50">
            {formatPrice(price)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            per{" "}
            {guests === 1 ? t("person") || "person" : t("people") || "person"}
          </span>
        </div>

        {/* Capacity */}
        <div className="flex flex-col items-center text-center p-4 bg-white/50 rounded-lg">
          <Icon icon="Users" className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("capacity") || "Capacity"}
          </span>
          <span className="text-2xl font-bold text-guarumo-primary dark:text-zinc-50">
            {content.capacity || 4}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("guests") || "guests"}
          </span>
        </div>

        {/* Property Type */}
        <div className="flex flex-col items-center text-center p-4 bg-white/50 rounded-lg">
          <Icon icon="Home" className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("type") || "Type"}
          </span>
          <span className="text-lg font-bold text-guarumo-primary dark:text-zinc-50 capitalize">
            {content.propertyType || "Villa"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {content.bedrooms || 1} {t("bed") || "bed"},{" "}
            {content.bathrooms || 1} {t("bath") || "bath"}
          </span>
        </div>

        {/* Location */}
        <div className="flex flex-col items-center text-center p-4 bg-white/50 rounded-lg">
          <Icon icon="MapPin" className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("location") || "Location"}
          </span>
          <span className="text-lg font-bold text-guarumo-primary dark:text-zinc-50">
            {content.location?.city || "Puerto Jiménez"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {content.location?.country || "Costa Rica"}
          </span>
        </div>
      </div>

      {/* Highlight Features */}
      {content.highlightFeatures && content.highlightFeatures.length > 0 && (
        <div className="mt-6 pt-6 border-t border-guarumo-primary/20">
          <h3 className="text-lg font-semibold text-guarumo-primary dark:text-zinc-50 mb-3 text-center">
            {t("whatGuestsLoveMost") || "What guests love most"}
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {content.highlightFeatures.slice(0, 4).map((feature, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-guarumo-accent/20 text-guarumo-primary dark:text-zinc-50 border-guarumo-accent/30"
              >
                {feature.icon && (
                  <Icon icon={feature.icon} className="h-3 w-3 mr-1" />
                )}
                {feature.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Check-in/Check-out Times */}
      <div className="mt-4 pt-4 border-t border-guarumo-primary/20 flex justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <Icon icon="Clock" className="h-4 w-4 text-guarumo-primary" />
          <span className="text-gray-600 dark:text-gray-400">
            {t("checkIn") || "Check-in"}:
          </span>
          <span className="font-medium text-guarumo-primary dark:text-zinc-50">
            {content.checkInTime || "3:00 PM"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="Clock" className="h-4 w-4 text-guarumo-primary" />
          <span className="text-gray-600 dark:text-gray-400">
            {t("checkOut") || "Check-out"}:
          </span>
          <span className="font-medium text-guarumo-primary dark:text-zinc-50">
            {content.checkOutTime || "11:00 AM"}
          </span>
        </div>
      </div>
    </div>
  )
}
