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
}: AvailabilityPreviewProps) {
  const t = useTranslations("booking")
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isAvailable: null,
    isLoading: false,
    error: undefined,
  })

  useEffect(() => {
    const checkAvailability = async () => {
      if (!checkIn || !checkOut || bookingType !== "villa") {
        setAvailability({ isAvailable: null, isLoading: false })
        return
      }

      // Don't check availability if calendar is still loading
      if (calendarLoading) {
        setAvailability({ isAvailable: null, isLoading: true })
        return
      }

      setAvailability({ isAvailable: null, isLoading: true })

      try {
        const response = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to check availability")
        }

        const data = await response.json()
        setAvailability({
          isAvailable: data.isAvailable,
          isLoading: false,
        })
      } catch (error) {
        console.error("Error checking availability:", error)
        setAvailability({
          isAvailable: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Debounce the availability check
    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [checkIn, checkOut, bookingType, calendarLoading])

  if (bookingType !== "villa") {
    return null
  }

  if (!checkIn || !checkOut) {
    return (
      <div
        className={`flex items-center gap-2 text-gray-500 text-sm ${className}`}
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
        className={`flex items-center gap-2 text-blue-600 text-sm ${className}`}
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
        className={`flex items-center gap-2 text-red-600 text-sm ${className}`}
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
      className={`flex items-center gap-2 text-sm font-medium ${
        availability.isAvailable ? "text-green-600" : "text-red-600"
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
