"use client"
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
import { useTranslations } from "next-intl"

interface IDatePicker {
  isOpen?: boolean
  onClose?: () => void
  onOpen?: () => void
  onSelectDate: (date: Date) => void
  label: string
  selectedDate?: Date
  className?: string
  disabledDates?: Date[]
  loading?: boolean
  minDate?: Date
  month?: Date
  defaultMonth?: Date
  /** Forwarded to the trigger button for e2e tests */
  triggerTestId?: string
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
  triggerTestId,
}: IDatePicker) => {
  const params = useParams()
  const t = useTranslations("booking")

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

  const loadingLabel = t("loadingCalendar", {
    defaultValue: "Loading calendar...",
  })

  return (
    <Popover
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose?.()
      }}
    >
      <PopoverTrigger asChild onClick={loading ? undefined : onOpen}>
        <Button
          variant="outline"
          disabled={loading}
          className={`flex-col items-start w-full h-auto dark:bg-zinc-600 hover:dark:text-zinc-50 hover:transform-none ${className}`}
          name="select-date-button"
          data-testid={triggerTestId}
        >
          {loading ? (
            <span className="font-semibold">{loadingLabel}</span>
          ) : !selectedDate ? (
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
        {loading ? (
          <div className="flex flex-col items-center p-6">
            <Loading />
            <span className="my-4">{loadingLabel}</span>
          </div>
        ) : (
          <Calendar
            mode="single"
            disabled={date => setDisabledDates(date)}
            onSelect={(_, selectedDay) => onSelectDate(selectedDay)}
            selected={selectedDate || undefined}
            defaultMonth={defaultMonth || selectedDate || new Date()}
            startMonth={minDate || new Date()}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
