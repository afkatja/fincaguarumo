"use client"

import React, { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { useBooking } from "@/app/providers/BookingProvider"
import { useDialog } from "@/app/providers/DialogProvider"
import { BookingType, initialBookingData } from "@/types"
import BookingDialogContent from "@/app/providers/BookingDialogContent"

export default function GlobalBookingDialog() {
  const [paymentStep, setPaymentStep] = useState(false)
  const { bookingData, setBookingData } = useBooking()
  const { isBookingDialogOpen, closeBookingDialog } = useDialog()

  const closeHandler = () => {
    // Reset checkIn and checkOut dates when dialog is closed
    setBookingData({
      ...bookingData,
      bookingDetails: {
        ...bookingData.bookingDetails,
        checkIn: initialBookingData.bookingDetails.checkIn,
        checkOut: initialBookingData.bookingDetails.checkOut,
      },
    })
    closeBookingDialog()
    setPaymentStep(false)
  }

  const bookingType: BookingType =
    (bookingData.bookingDetails.type as BookingType) || "villa"

  return (
    <Dialog open={isBookingDialogOpen} onOpenChange={closeHandler}>
      <BookingDialogContent
        bookingData={bookingData}
        title={bookingData.bookingDetails.title || "Book Your Stay"}
        paymentStep={paymentStep}
        onBookingFormSubmit={() => setPaymentStep(true)}
        onCancel={closeHandler}
        bookingType={bookingType}
        locale="en"
      />
    </Dialog>
  )
}
