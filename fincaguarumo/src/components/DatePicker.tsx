"use client"
import React from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import CalendarIcon from "./icons/Calendar"
import { useParams } from "next/navigation"
import Loading from "../app/[locale]/(pages)/loading"
import { formatForDisplay } from "../lib/dateUtils"

interface IDatePicker {
  isOpen?: boolean
  onClose?: () => void
  onOpen?: () => void
  onSelectDate: (date: Date) => void
  label: string
  selectedDate: Date
  className?: string
  disabledDates?: Date[]
  loading?: boolean
  minDate?: Date
  month?: Date
  defaultMonth?: Date
}

const DatePicker = ({
  isOpen,
  onClose,
  onOpen,
  onSelectDate,
  label,
  selectedDate,
  className,
  disabledDates,
  loading,
  minDate,
  month,
  defaultMonth,
}: IDatePicker) => {
  const params = useParams()
  const locale = Array.isArray(params.locale)
    ? params.locale[0]
    : params.locale || "en"

  const setDisabledDates = (date: Date) => {
    if (date < new Date()) return true
    if (minDate && date < minDate) return true
    return (disabledDates || []).some(
      d => d.toDateString() === date.toDateString(),
    )
  }

  if (loading) return <Loading />

  return (
    <Popover open={isOpen}>
      {isOpen && (
        <div
          className="overlay fixed top-0 left-0 w-screen h-screen"
          onClick={onClose}
        />
      )}
      <PopoverTrigger asChild onClick={onOpen}>
        <Button
          variant="outline"
          className={`flex-col items-start w-full h-auto dark:bg-zinc-600 hover:dark:text-zinc-50 hover:transform-none ${className}`}
          name="select-date-button"
        >
          {!selectedDate ? (
            <span className="font-semibold flex items-center">
              <CalendarIcon size={16} className="mr-2" /> {label}
            </span>
          ) : (
            <span className="font-normal">
              {formatForDisplay(selectedDate ?? new Date(), locale)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 ">
        <Calendar
          mode="single"
          disabled={date => setDisabledDates(date)}
          onSelect={(_, selectedDay) => onSelectDate(selectedDay)}
          selected={selectedDate}
          defaultMonth={defaultMonth || selectedDate || new Date()}
          startMonth={minDate || new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
