"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { BookingType } from "@/types"
import { bookingEventBus } from "@/app/providers/BookingEventBus"

interface BookingDialogTriggerProps {
  bookingType: BookingType
  buttonText?: string
  buttonClassName?: string
  className?: string
  children?: React.ReactNode
  dataId?: string
  dialogId?: string
}

export default function BookingDialogTrigger({
  bookingType,
  buttonText,
  buttonClassName,
  className,
  children,
  dataId,
  dialogId,
}: BookingDialogTriggerProps) {
  const handleTrigger = () => {
    bookingEventBus.emit({
      type: "DIALOG_OPEN_REQUESTED",
      payload: {
        bookingType,
        source: "page",
        dialogId,
      },
    })
  }

  // If children provided, use them as trigger (allows custom styling)
  if (children) {
    return <div onClick={handleTrigger}>{children}</div>
  }

  // Default button trigger
  return (
    <Button
      name="booking-trigger-button"
      size="lg"
      className={buttonClassName || className}
      variant="secondary"
      onClick={handleTrigger}
      data-testid={dataId}
      // disabled={bookingType === BOOKING_TYPE.villa && loading}
    >
      {buttonText || "Book Now"}
    </Button>
  )
}
