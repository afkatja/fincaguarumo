"use client"

import * as React from "react"
// import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      animate
      weekStartsOn={1}
      className={cn("p-3 border rounded-md", className)}
      classNames={{
        ...getDefaultClassNames(),
        months: "months w-full relative flex gap-1 overflow-hidden",
        month:
          "month w-full flex flex-col gap-1 animate-fadeIn transition-all duration-300 ease-in-out",
        month_caption: "flex gap-2 justify-center items-center py-1 mb-2",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        chevron: "fill-zinc-700",
        button_previous:
          "size-3 w-9 h-9 bg-transparent px-0 opacity-50 hover:opacity-100 outline-none shadow-none has-[>svg]:px-1 cursor-pointer absolute left-0 top-0 m-0",
        button_next:
          "size-3 w-9 h-9 bg-transparent px-0 opacity-50 hover:opacity-100 outline-none shadow-none has-[>svg]:px-1 cursor-pointer absolute right-0 top-0 m-0",
        table: "w-full border-collapse space-x-1",
        weekdays: "flex mb-1",
        weekday:
          "h-9 w-9 text-muted-foreground rounded-md font-normal text-[0.8rem]",
        week: "flex w-full",
        day: cn(
          "h-9 w-9 relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].range-end)]:rounded-r-md rounded-md font-normal aria-selected:opacity-100 hover:bg-gray-100 transition-colors duration-200 cursor-pointer",
          props.mode === "range"
            ? "[&:has(>.range-end)]:rounded-r-md [&:has(>.range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "w-full h-full p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
        ),
        range_start:
          "range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        range_end:
          "range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "outside text-muted-foreground aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={
        {
          // IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
          // IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        }
      }
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
