import React from "react"

import { Label } from "./label"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { Calendar } from "./calendar"

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
  return (
    <>
      <Label htmlFor="date">{label}</Label>
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
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

export default datepicker
