import React from "react"
import { saveAs } from "file-saver"
import { Button } from "./ui/button"
import Icon from "./Icon"
import { Booking, bookingToIcsEvent } from "../lib/ical"

const AddToCalendar = ({ event }: { event: Booking }) => {
  const handleAddToCalendar = () => {
    const icsString = bookingToIcsEvent(event)

    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" })
    saveAs(blob, "event.ics")
  }
  return (
    <Button onClick={handleAddToCalendar} className="flex items-center">
      <Icon
        icon="Calendar"
        className="h-4 w-4 mr-4 stroke-zinc-50 dark:stroke-slate-50"
      />
      Add to Calendar
    </Button>
  )
}

export default AddToCalendar
