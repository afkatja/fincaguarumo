import React from "react"
import { saveAs } from "file-saver"
import { createEvent } from "ics"
import { Button } from "./ui/button"
import Icon from "./Icon"

const AddToCalendar = ({ event }: { event: Record<string, any> }) => {
  const handleAddToCalendar = () => {
    const { start, duration, title, description, location, geo } = event as {
      start: string
      duration: string
      title: string
      description: string
      location?: string
      geo?: { lat: string; lng: string }
    }
    const date = new Date(start)

    const eventDetails = {
      start: [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        // date.getHours(),
        // date.getMinutes()
      ],
      duration: {
        hours: parseInt(duration),
        minutes: 0,
      },
      title,
      description,
      location,
      url: window.location.href,
      geo: geo ? { lat: Number(geo.lat), lon: Number(geo.lng) } : undefined,
    }

    //@ts-ignore
    createEvent(eventDetails, (error, value) => {
      if (error) {
        console.error(error)
        return
      }

      const blob = new Blob([value], { type: "text/calendar;charset=utf-8" })
      saveAs(blob, "event.ics")
    })
  }
  return (
    <Button onClick={handleAddToCalendar} className="flex items-center">
      <Icon icon="Calendar" className="h-4 w-4 mr-4 dark:stroke-slate-50" />
      Add to Calendar
    </Button>
  )
}

export default AddToCalendar
