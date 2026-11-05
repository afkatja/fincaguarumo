"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import Icon from "@/components/Icon"

interface LogisticsItem {
  title: string
  category: string
  description?: string
  instructions?: string
  checkInTime?: string
  checkOutTime?: string
  earlyCheckIn?: boolean
  earlyCheckInFee?: number
  lateCheckOut?: boolean
  lateCheckOutFee?: number
  contactInfo?: string
  address?: string
  distance?: string
  isImportant?: boolean
  displayOrder?: number
  keywords?: string[]
}

interface LogisticsProps {
  logistics: LogisticsItem[]
  locale: string
}

const categoryConfig: Record<
  string,
  {
    label: string
    icon: string
    color: string
    bgColor: string
  }
> = {
  checkin_checkout: {
    label: "Check-in / Check-out",
    icon: "Calendar",
    color: "text-guarumo-primary",
    bgColor: "bg-guarumo-primary/10",
  },
  transportation: {
    label: "Transportation",
    icon: "Info",
    color: "text-muted-foreground",
    bgColor: "bg-muted/10",
  },
  local_area: {
    label: "Local Area",
    icon: "Pin",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  emergency: {
    label: "Emergency & Safety",
    icon: "Error",
    color: "text-red-600",
    bgColor: "bg-red-600/10",
  },
  house_rules: {
    label: "House Rules",
    icon: "Info",
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
  },
  services: {
    label: "Services & Amenities",
    icon: "Pin",
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
  },
}

const formatCurrency = (amount?: number, locale = "en-US") => {
  if (!amount) return ""
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function Logistics({ logistics, locale }: LogisticsProps) {
  const t = useTranslations("logistics")
  const [openCategory, setOpenCategory] = useState<string | null>("checkin_checkout")

  if (!logistics || logistics.length === 0) return null

  // Group logistics by category and sort by displayOrder
  const grouped = logistics.reduce(
    (acc, item) => {
      const cat = item.category || "services"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, LogisticsItem[]>,
  )

  // Sort items within each category
  Object.values(grouped).forEach(items => {
    items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  })

  return (
    <section
      className="my-8"
      id="logistics"
      aria-labelledby="logistics-heading"
    >
      <div className="space-y-4">
        {Object.entries(grouped)
          .sort(([catA], [catB]) => {
            const order = [
              "checkin_checkout",
              "transportation",
              "local_area",
              "emergency",
              "house_rules",
              "services",
            ]
            return order.indexOf(catA) - order.indexOf(catB)
          })
          .map(([category, items]) => {
            const config = categoryConfig[category] || categoryConfig.services
            const isOpen = openCategory === category

            return (
              <CollapsibleSection
                key={category}
                title={
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        config.bgColor,
                      )}
                    >
                      <Icon
                        icon={config.icon as any}
                        className="h-5 w-5"
                        color="var(--color-muted-foreground)"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {items.length} {items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                }
                isExpanded={isOpen}
                onToggle={() => setOpenCategory(openCategory === category ? null : category)}
                className="bg-card border border-border"
                displayOnDesktop
              >
                <div className="space-y-4 pt-2">
                  {items.map((item, index) => (
                    <article
                      key={`${category}-${item.title}-${index}`}
                      className={cn(
                        "p-4 rounded-xl border border-border/50 bg-muted/30",
                        item.isImportant &&
                          "ring-2 ring-guarumo-primary/20 bg-guarumo-primary/5",
                      )}
                    >
                      <header className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{item.title}</h4>
                          {item.isImportant && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-guarumo-primary/10 text-guarumo-primary rounded-full">
                              {t("important", { defaultValue: "Important" })}
                            </span>
                          )}
                        </div>
                      </header>

                      <div className="space-y-3 text-sm">
                        {item.description && (
                          <p className="text-muted-foreground whitespace-pre-line">
                            {item.description}
                          </p>
                        )}

                        {item.instructions && (
                          <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              {t("instructions", { defaultValue: "Instructions" })}
                            </p>
                            <p className="whitespace-pre-line">{item.instructions}</p>
                          </div>
                        )}

                        {/* Check-in/Check-out specific fields */}
                        {category === "checkin_checkout" && (
                          <div className="grid gap-3 md:grid-cols-2">
                            {item.checkInTime && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Icon
                                  icon="Clock"
                                  className="h-4 w-4 text-muted-foreground"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("checkInTime", {
                                      defaultValue: "Check-in Time",
                                    })}
                                  </p>
                                  <p className="font-medium">{item.checkInTime}</p>
                                </div>
                              </div>
                            )}
                            {item.checkOutTime && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Icon
                                  icon="Clock"
                                  className="h-4 w-4 text-muted-foreground"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("checkOutTime", {
                                      defaultValue: "Check-out Time",
                                    })}
                                  </p>
                                  <p className="font-medium">{item.checkOutTime}</p>
                                </div>
                              </div>
                            )}
                            {item.earlyCheckIn && (
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <Icon
                                  icon="Success"
                                  color="var(--color-guarumo-primary)"
                                  className="h-4 w-4"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("earlyCheckIn", {
                                      defaultValue: "Early Check-in Available",
                                    })}
                                  </p>
                                  {item.earlyCheckInFee && (
                                    <p className="font-medium">
                                      {t("earlyCheckInFee", { defaultValue: "Fee" })}:{" "}
                                      {formatCurrency(item.earlyCheckInFee, locale)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {item.lateCheckOut && (
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <Icon
                                  icon="Clock"
                                  color="var(--color-guarumo-primary)"
                                  className="h-4 w-4"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("lateCheckOut", {
                                      defaultValue: "Late Check-out Available",
                                    })}
                                  </p>
                                  {item.lateCheckOutFee && (
                                    <p className="font-medium">
                                      {t("lateCheckOutFee", { defaultValue: "Fee" })}:{" "}
                                      {formatCurrency(item.lateCheckOutFee, locale)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transportation / Local Area specific fields */}
                        {["transportation", "local_area"].includes(category) && (
                          <div className="flex flex-wrap gap-3">
                            {item.address && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Icon
                                  icon="Pin"
                                  color="var(--color-foreground)"
                                  className="h-4 w-4"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("address", { defaultValue: "Address" })}
                                  </p>
                                  <p className="font-medium text-sm">
                                    {item.address}
                                  </p>
                                </div>
                              </div>
                            )}
                            {item.distance && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <Icon
                                  icon="Navigation"
                                  color="var(--color-muted-foreground)"
                                  className="h-4 w-4"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("distance", { defaultValue: "Distance" })}
                                  </p>
                                  <p className="font-medium">{item.distance}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Emergency specific fields */}
                        {category === "emergency" && item.contactInfo && (
                          <div className="flex items-center gap-2 p-3 bg-destructive rounded-lg border border-destructive">
                            <Icon
                              icon="Phone"
                              color="var(--color-destructive)"
                              className="h-5 w-5"
                            />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("contactInfo", {
                                  defaultValue: "Contact Information",
                                })}
                              </p>
                              <p className="font-medium">{item.contactInfo}</p>
                            </div>
                          </div>
                        )}

                        {item.keywords && item.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {item.keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </CollapsibleSection>
            )
          })}
      </div>
    </section>
  )
}