"use client"

import React, { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { useBooking } from "@/app/providers/BookingProvider"
import { useDialog } from "@/app/providers/DialogProvider"
import { BookingType, initialBookingData } from "@/types"
import BookingDialogContent from "@/app/providers/BookingDialogContent"

export default function GlobalBookingDialog({ locale }: { locale: string }) {
  const [paymentStep, setPaymentStep] = useState(false)
  const { bookingData, setBookingData } = useBooking()
  const { isBookingDialogOpen, closeBookingDialog } = useDialog()

  // Set source when global dialog opens
  React.useEffect(() => {
    if (isBookingDialogOpen && bookingData.source !== "global") {
      setBookingData(prev => ({ ...prev, source: "global" }))
    }
  }, [isBookingDialogOpen, bookingData.source, setBookingData])

  const closeHandler = () => {
    // Only reset dates if this dialog was the one that set them
    if (bookingData.source === "global") {
      setBookingData(initialBookingData)
    }
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
        onBookingFormSubmit={submittedBookingData => {
          // Update booking data with the finalized data from the form
          setBookingData(submittedBookingData)
          setPaymentStep(true)
        }}
        onCancel={closeHandler}
        bookingType={bookingType}
        locale={locale}
      />
    </Dialog>
  )
}
