"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface AvailabilityPreviewProps {
  checkIn?: Date | null
  checkOut?: Date | null
  bookingType: "villa" | "tour"
  className?: string
  calendarLoading?: boolean
  blockedDates?: Date[] // Add blocked dates from calendar
  onAvailabilityChange?: (isAvailable: boolean | null) => void
}

interface AvailabilityStatus {
  isAvailable: boolean | null
  isLoading: boolean
  error?: string
}

export default function AvailabilityPreview({
  checkIn,
  checkOut,
  bookingType,
  className = "",
  calendarLoading = false,
  blockedDates = [],
  onAvailabilityChange,
}: AvailabilityPreviewProps) {
  const t = useTranslations("booking")
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isAvailable: null,
    isLoading: false,
    error: undefined,
  })

  useEffect(() => {
    const checkAvailability = () => {
      if (!checkIn || !checkOut || bookingType !== "villa") {
        setAvailability({ isAvailable: null, isLoading: false })
        if (onAvailabilityChange) {
          onAvailabilityChange(null)
        }
        return
      }

      // Don't check availability if calendar is still loading
      if (calendarLoading) {
        setAvailability({ isAvailable: null, isLoading: true })
        if (onAvailabilityChange) {
          onAvailabilityChange(null)
        }
        return
      }

      setAvailability({ isAvailable: null, isLoading: true })

      try {
        // Check availability using blocked dates from calendar
        // This eliminates the redundant API call
        const currentDate = new Date(checkIn)
        let hasConflict = false

        while (currentDate < checkOut && !hasConflict) {
          const dateStr = currentDate.toISOString().split("T")[0]
          if (
            blockedDates.some(
              date => date.toISOString().split("T")[0] === dateStr,
            )
          ) {
            hasConflict = true
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }

        setAvailability({
          isAvailable: !hasConflict,
          isLoading: false,
        })

        // Notify parent component of availability change
        if (onAvailabilityChange) {
          onAvailabilityChange(!hasConflict)
        }
      } catch (error) {
        console.error("Error checking availability:", error)
        setAvailability({
          isAvailable: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        if (onAvailabilityChange) {
          onAvailabilityChange(null)
        }
      }
    }

    // Debounce the availability check
    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [
    checkIn,
    checkOut,
    bookingType,
    calendarLoading,
    blockedDates,
    onAvailabilityChange,
  ])

  if (bookingType !== "villa") {
    return null
  }

  if (!checkIn || !checkOut) {
    return (
      <div
        className={`flex items-center gap-2 text-zinc-500 text-sm ${className}`}
      >
        <Calendar className="w-4 h-4" />
        <span>
          {t("selectDates", {
            defaultValue: "Select dates to check availability",
          })}
        </span>
      </div>
    )
  }

  if (availability.isLoading) {
    return (
      <div
        className={`flex items-center gap-2 text-foreground-muted text-sm ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>
          {calendarLoading
            ? t("loadingCalendar", { defaultValue: "Loading calendar..." })
            : t("checkingAvailability", {
                defaultValue: "Checking availability...",
              })}
        </span>
      </div>
    )
  }

  if (availability.error) {
    return (
      <div
        className={`flex items-center gap-2 text-destructive text-sm ${className}`}
      >
        <XCircle className="w-4 h-4" />
        <span>
          {t("availabilityError", {
            defaultValue: "Could not check availability",
          })}
        </span>
      </div>
    )
  }

  if (availability.isAvailable === null) {
    return null
  }

  return (
    <div
      data-testid="availability-preview"
      className={`flex items-center gap-2 text-sm font-medium ${
        availability.isAvailable ? "text-guarumo-primary" : "text-destructive"
      } ${className}`}
    >
      {availability.isAvailable ? (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>
            {t("available", { defaultValue: "Available for your dates!" })}
          </span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4" />
          <span>
            {t("notAvailable", {
              defaultValue: "Not available for these dates",
            })}
          </span>
        </>
      )}
    </div>
  )
}
