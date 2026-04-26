"use client"

import React, { useEffect, useState, useRef } from "react"
import { useTranslations } from "next-intl"
import DatePicker from "./DatePicker"

// Global cache to prevent duplicate calendar requests
const calendarRequestCache = {
  inProgress: false,
  lastFetch: 0,
  cooldown: 30000, // 30 seconds cooldown
  cachedData: null as any,
}

const BookingCalendar = ({
  onSelectDate,
  labels: { checkinDate, checkoutDate } = {
    checkinDate: "Check-in date",
    checkoutDate: "Check-out date",
  },
  selectedDates,
  error,
  onLoadingChange,
  onBlockedDatesChange,
}: {
  onSelectDate: (date: Date, type: string) => void
  labels: { checkinDate: string; checkoutDate: string }
  selectedDates: { checkIn?: Date; checkOut?: Date }
  error?: string
  onLoadingChange?: (loading: boolean) => void
  onBlockedDatesChange?: (blockedDates: Date[]) => void
}) => {
  const t = useTranslations("booking")
  const [loading, setLoading] = useState(false)
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const componentId = useRef(
    `calendar-${Math.random().toString(36).substr(2, 9)}`,
  )

  // Update parent component when loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading)
    }
  }, [loading, onLoadingChange])

  // Update parent component when blocked dates change
  useEffect(() => {
    if (onBlockedDatesChange) {
      onBlockedDatesChange(blockedDates)
    }
  }, [blockedDates, onBlockedDatesChange])

  useEffect(() => {
    if (blockedDates.length) return
    setLoading(true)

    const fetchData = async () => {
      const now = Date.now()

      // Check if we have cached data or if a request is in progress
      if (calendarRequestCache.inProgress) {
        console.log(
          `[${componentId.current}] Calendar request already in progress, waiting...`,
        )
        // Wait for the existing request to complete
        const checkInterval = setInterval(() => {
          if (
            !calendarRequestCache.inProgress &&
            calendarRequestCache.cachedData
          ) {
            clearInterval(checkInterval)
            const blockedDatesArray = (
              calendarRequestCache.cachedData.blockedDates || []
            ).map((date: string) => new Date(date))
            setBlockedDates(blockedDatesArray)
            setLoading(false)
          }
        }, 100)
        return
      }

      // Check if we have recent cached data
      if (
        calendarRequestCache.cachedData &&
        now - calendarRequestCache.lastFetch < calendarRequestCache.cooldown
      ) {
        console.log(`[${componentId.current}] Using cached calendar data`)
        const blockedDatesArray = (
          calendarRequestCache.cachedData.blockedDates || []
        ).map((date: string) => new Date(date))
        setBlockedDates(blockedDatesArray)
        setLoading(false)
        return
      }

      // Mark request as in progress
      calendarRequestCache.inProgress = true
      console.log(`[${componentId.current}] Starting calendar request...`)

      try {
        // Use the unified availability endpoint that matches the availability checking data
        const data = await fetch("/api/availability/calendar")
        const json = await data.json()

        if (!data.ok) {
          console.error("Error fetching calendar availability:", json.error)
          setBlockedDates([])
          return
        }

        // Cache the response
        calendarRequestCache.cachedData = json
        calendarRequestCache.lastFetch = now
        calendarRequestCache.inProgress = false
        console.log(
          `[${componentId.current}] Calendar request completed and cached`,
        )

        // Convert blocked dates from ISO strings to Date objects
        const blockedDatesArray = (json.blockedDates || []).map(
          (date: string) => new Date(date),
        )
        setBlockedDates(blockedDatesArray)
      } catch (error) {
        console.error(
          `[${componentId.current}] Error fetching calendar availability:`,
          error,
        )
        setBlockedDates([])
      } finally {
        setLoading(false)
        calendarRequestCache.inProgress = false
      }
    }

    fetchData()
  }, []) // Remove blockedDates dependency to prevent re-fetches

  return (
    <div data-testid="booking-calendar">
      <div className="space-y-2">
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </div>
      <div className="md:grid md:grid-cols-2 gap-2">
        <DatePicker
          isOpen={activePopover === "check-in"}
          onClose={() => setActivePopover(null)}
          onOpen={() => setActivePopover("check-in")}
          onSelectDate={date => {
            onSelectDate(date, "check-in")
            setActivePopover(null)
          }}
          label={checkinDate}
          selectedDate={selectedDates.checkIn || undefined}
          disabledDates={blockedDates}
          loading={loading}
          defaultMonth={selectedDates.checkIn || new Date()}
          triggerTestId="select-check-in"
        />

        <div className="md:ml-4 mt-4 md:mt-0">
          <DatePicker
            label={checkoutDate}
            selectedDate={selectedDates.checkOut || undefined}
            isOpen={activePopover === "check-out"}
            onClose={() => setActivePopover(null)}
            onOpen={() => setActivePopover("check-out")}
            onSelectDate={date => {
              onSelectDate(date, "check-out")
              setActivePopover(null)
            }}
            disabledDates={blockedDates}
            loading={loading}
            minDate={selectedDates.checkIn}
            defaultMonth={selectedDates.checkIn || new Date()}
            triggerTestId="select-check-out"
          />
        </div>
      </div>
    </div>
  )
}

export default BookingCalendar
