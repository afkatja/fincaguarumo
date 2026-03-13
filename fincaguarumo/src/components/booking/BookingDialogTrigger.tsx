"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { useDialog } from "@/app/providers/DialogProvider"
import { useBooking } from "@/app/providers/BookingProvider"
import { BookingType, BOOKING_TYPE } from "@/types"

interface BookingDialogTriggerProps {
  bookingType: BookingType
  title: string
  description?: string
  buttonText?: string
  buttonClassName?: string
  className?: string
  price?: number
  children?: React.ReactNode
}

export default function BookingDialogTrigger({
  bookingType,
  title,
  description,
  buttonText,
  buttonClassName,
  className,
  price,
  children,
}: BookingDialogTriggerProps) {
  const { openBookingDialog } = useDialog()
  const { setBookingData } = useBooking()

  const handleTrigger = () => {
    // Set booking data for the dialog
    setBookingData(prev => ({
      ...prev,
      source: "external", // Using a single source for external triggers
      bookingDetails: {
        ...prev.bookingDetails,
        type: bookingType,
        title,
        description: description || "",
        price: price || prev.bookingDetails.price,
      },
    }))
    // Open the booking dialog
    openBookingDialog()
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
    >
      {buttonText || "Book Now"}
    </Button>
  )
}
