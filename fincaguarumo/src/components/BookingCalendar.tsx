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
  failed: false,
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

        // Clear any existing interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }

        // Set timeout to prevent infinite polling (10 seconds max)
        const timeoutId = setTimeout(() => {
          console.warn(
            `[${componentId.current}] Calendar request timeout, giving up`,
          )
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setBlockedDates([])
          setLoading(false)
        }, 10000)

        // Wait for the existing request to complete
        pollIntervalRef.current = setInterval(() => {
          if (!calendarRequestCache.inProgress) {
            // Clear timeout and interval
            clearTimeout(timeoutId)
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }

            // Handle success or failure
            if (calendarRequestCache.cachedData) {
              const blockedDatesArray = (
                calendarRequestCache.cachedData.blockedDates || []
              ).map((date: string) => new Date(date))
              setBlockedDates(blockedDatesArray)
              setLoading(false)
            } else if (calendarRequestCache.failed) {
              console.warn(
                `[${componentId.current}] Calendar request failed, using empty dates`,
              )
              setBlockedDates([])
              setLoading(false)
            }
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
          // Cache empty data and set failed flag
          calendarRequestCache.cachedData = { blockedDates: [] }
          calendarRequestCache.failed = true
          calendarRequestCache.inProgress = false
          setBlockedDates([])
          setLoading(false)
          return
        }

        // Cache the response and clear failed flag
        calendarRequestCache.cachedData = json
        calendarRequestCache.failed = false
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
        // Cache empty data and set failed flag
        calendarRequestCache.cachedData = { blockedDates: [] }
        calendarRequestCache.failed = true
        setBlockedDates([])
      } finally {
        setLoading(false)
        calendarRequestCache.inProgress = false
      }
    }

    fetchData()
  }, []) // Remove blockedDates dependency to prevent re-fetches

  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

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
