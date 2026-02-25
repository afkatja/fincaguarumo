"use client"
import { AccommodationContent } from "@/app/[locale]/(pages)/villa-bruno/page"
import Icon from "./Icon"
import { DynamicLucideIcon } from "./DynamicLucideIcon"
import { Badge } from "./ui/badge"
import { useTranslations } from "next-intl"
import { DollarSign, HomeIcon, User2Icon } from "lucide-react"

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
    <div className="rounded-lg p-6 border border-guarumo-primary/20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Price */}
        <div className="flex flex-col items-center text-center p-4 bg-zinc-50/50 rounded-lg">
          <DollarSign className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("from")}
          </span>
          <span className="text-2xl font-bold text-guarumo-primary dark:text-zinc-50">
            {formatPrice(price)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            per {guests === 1 ? t("person") : t("people")}
          </span>
        </div>

        {/* Capacity */}
        <div className="flex flex-col items-center text-center p-4 bg-zinc-50/50 rounded-lg">
          <User2Icon className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("capacity")}
          </span>
          <span className="text-2xl font-bold text-guarumo-primary dark:text-zinc-50">
            {content.capacity || 4}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("guests")}
          </span>
        </div>

        {/* Property Type */}
        <div className="flex flex-col items-center text-center p-4 bg-zinc-50/50 rounded-lg">
          <HomeIcon className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("type")}
          </span>
          <span className="text-lg font-bold text-guarumo-primary dark:text-zinc-50 capitalize">
            {content.propertyType || "Villa"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {content.bedrooms || 1} {t("bed")}, {content.bathrooms || 1}{" "}
            {t("bath")}
          </span>
        </div>

        {/* Location */}
        <div className="flex flex-col items-center text-center p-4 bg-zinc-50/50 rounded-lg">
          <Icon icon="Pin" className="h-8 w-8 text-guarumo-primary mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("location")}
          </span>
          <span className="text-lg font-bold text-guarumo-primary dark:text-zinc-50">
            {content.location?.city || "Puerto Jiménez"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {content.location?.country || "Costa Rica"}
          </span>
        </div>
      </div>

      {/* Check-in/Check-out Times */}
      <div className="mt-4 pt-4 border-t border-guarumo-primary/20 flex justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <Icon icon="Clock" className="h-4 w-4 text-guarumo-primary" />
          <span className="text-gray-600 dark:text-gray-400">
            {t("checkIn")}:
          </span>
          <span className="font-medium text-guarumo-primary dark:text-zinc-50">
            {content.checkInTime || "3:00 PM"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="Clock" className="h-4 w-4 text-guarumo-primary" />
          <span className="text-gray-600 dark:text-gray-400">
            {t("checkOut")}:
          </span>
          <span className="font-medium text-guarumo-primary dark:text-zinc-50">
            {content.checkOutTime || "11:00 AM"}
          </span>
        </div>
      </div>
    </div>
  )
}
