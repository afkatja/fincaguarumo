import React from "react"
import { saveAs } from "file-saver"
import { createEvent } from "ics"
import { Button } from "./ui/button"

const AddToCalendar = ({ event }: { event: Record<string, any> }) => {
  const handleAddToCalendar = () => {
    const { start, duration, title, description, location, geo } = event as {
      start: [number, number, number, number, number]
      duration: { hours: number; minutes: number }
      title: string
      description: string
      location?: string
      geo?: { lat: number; lon: number }
    }

    const eventDetails = {
      start,
      duration,
      title,
      description,
      location,
      url: window.location.href,
      geo,
    }

    createEvent(eventDetails, (error, value) => {
      if (error) {
        console.log(error)
        return
      }

      const blob = new Blob([value], { type: "text/calendar;charset=utf-8" })
      saveAs(blob, "event.ics")
    })
  }
  return <Button onClick={handleAddToCalendar}>Add to Calendar</Button>
}

export default AddToCalendar
