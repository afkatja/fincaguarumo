import React from "react"

import { Label } from "./label"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { titleCase } from "../../lib/utils"

const generateDateRange = (startDate: Date = new Date(), days: number = 30) => {
  const dates = []
  const currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0) // Reset time to start of day

  for (let i = 0; i < days; i++) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

const datepicker = ({
  label,
  placeholder,
  selectedDate,
  onSelectDate,
}: {
  label: string
  placeholder: string
  selectedDate?: Date
  onSelectDate: (date: Date) => void
}) => {
  const availableDates = generateDateRange(new Date(), 180)
  return (
    <>
      <Label htmlFor="date">{titleCase(label)}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex-col items-start w-full h-auto"
          >
            <span className="font-semibold uppercase text-[0.65rem]">
              {placeholder}
            </span>
            <span className="font-normal">
              {(selectedDate ?? new Date()).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 max-w-[276px]">
          <Calendar
            mode="single"
            onSelect={date => date && onSelectDate(date)}
            disabled={(date: Date) =>
              date < new Date() ||
              !availableDates.some(
                availableDate =>
                  availableDate.toDateString() === date.toDateString()
              )
            }
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

export default datepicker
