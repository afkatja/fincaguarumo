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
  disabledDates?: (Date | string)[]
  loading?: boolean
  minDate?: Date
  month?: Date
  defaultMonth?: Date
  /** Forwarded to the trigger button for e2e tests */
  triggerTestId?: string
}

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      if (date < min) return true
    }
    const dateStr = formatLocalDate(date)
    return (disabledDates || []).some(d => {
      const disabledStr = typeof d === "string" ? d.slice(0, 10) : formatLocalDate(d)
      return disabledStr === dateStr
    })
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
      modal
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
