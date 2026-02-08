import React, { useEffect, useState } from "react"
import DatePicker from "./DatePicker"

const BookingCalendar = ({
  onSelectDate,
  labels: { checkinDate, checkoutDate } = {
    checkinDate: "Check-in date",
    checkoutDate: "Check-out date",
  },
  selectedDates,
  error,
  onLoadingChange,
}: {
  onSelectDate: (date: Date, type: string) => void
  labels: { checkinDate: string; checkoutDate: string }
  selectedDates: { checkIn: Date; checkOut: Date }
  error?: string
  onLoadingChange?: (loading: boolean) => void
}) => {
  const [loading, setLoading] = useState(false)

  // Update parent component when loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading)
    }
  }, [loading, onLoadingChange])
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [blockedDates, setBlockedDates] = useState<Date[]>([])

  useEffect(() => {
    setLoading(true)

    const fetchData = async () => {
      try {
        // Use the unified availability endpoint that matches the availability checking data
        const data = await fetch("/api/availability/calendar")
        const json = await data.json()

        if (!data.ok) {
          console.error("Error fetching calendar availability:", json.error)
          setBlockedDates([])
          setLoading(false)
          return
        }

        // Convert blocked dates from ISO strings to Date objects
        const blockedDatesArray = (json.blockedDates || []).map(
          (date: string) => new Date(date),
        )
        setBlockedDates(blockedDatesArray)

        console.log(
          `Loaded ${blockedDatesArray.length} blocked dates from availability table`,
        )
      } catch (error) {
        console.error("Error fetching calendar availability:", error)
        setBlockedDates([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
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
          selectedDate={selectedDates.checkIn}
          disabledDates={blockedDates}
          loading={loading}
          month={selectedDates.checkIn || new Date()}
        />

        <div className="md:ml-4 mt-4 md:mt-0">
          <DatePicker
            label={checkoutDate}
            selectedDate={selectedDates.checkOut}
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
            month={selectedDates.checkIn || new Date()}
          />
        </div>
      </div>
    </>
  )
}

export default BookingCalendar
