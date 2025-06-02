import React from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import CalendarIcon from "./icons/Calendar"

interface IDatePicker {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
  onSelectDate: (date: Date) => void
  label: string
  selectedDate: string
  className?: string
}

const DatePicker = ({
  isOpen,
  onClose,
  onOpen,
  onSelectDate,
  label,
  selectedDate,
  className,
}: IDatePicker) => {
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
          className={`flex-col items-start w-full h-auto dark:bg-zinc-600  hover:dark:text-zinc-50 ${className}`}
        >
          {!selectedDate ? (
            <span className="font-semibold flex items-center">
              <CalendarIcon size={16} className="mr-2" /> {label}
            </span>
          ) : (
            <span className="font-normal">{selectedDate}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 max-w-[276px]">
        <Calendar
          mode="single"
          disabled={(date: Date) => date < new Date()}
          onSelect={(_, selectedDay) => onSelectDate(selectedDay)}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
