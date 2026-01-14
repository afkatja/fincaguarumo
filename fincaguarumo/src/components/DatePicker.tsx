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
}: IDatePicker) => {
  const params = useParams()
  const setDisabledDates = (date: Date) => {
    if (date < new Date()) return true
    if (minDate && date < minDate) return true
    return (disabledDates || []).some(
      d => d.toDateString() === date.toDateString()
    )
  }

  if (loading) return <Loading />

  return (
    <Popover open={isOpen}>
      {isOpen && (
        <div
          className="overlay fixed top-0 left-0 w-[100vw] h-[100vh]"
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
              {(selectedDate ?? new Date()).toLocaleDateString(params.locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
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
          startMonth={selectedDate ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
