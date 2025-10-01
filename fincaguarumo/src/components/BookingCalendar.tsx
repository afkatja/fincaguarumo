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
}: {
  onSelectDate: (date: Date, type: string) => void
  labels: { checkinDate: string; checkoutDate: string }
  selectedDates: { checkIn: Date; checkOut: Date }
  error?: string
}) => {
  const [loading, setLoading] = useState(false)
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [blockedDates, setBlockedDates] = useState<Date[]>([])

  useEffect(() => {
    setLoading(true)

    const fetchData = async () => {
      const data = await fetch("/api/ical/merged")
      const json = await data.json()

      if (!json?.merged) return
      setBlockedDates(
        json.merged.flatMap((d: Record<string, any>) =>
          d.blocked.map((date: string) => new Date(date))
        )
      )
      setLoading(false)
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
          />
        </div>
      </div>
    </>
  )
}

export default BookingCalendar
