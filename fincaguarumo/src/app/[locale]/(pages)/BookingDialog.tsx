"use client"
import React, { useState } from "react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

import { useBooking } from "../../providers/BookingProvider"
import { useDialog } from "../../providers/DialogProvider"
import { BookingType, initialBookingData } from "../../../types"
import { getInternationalizedValue } from "../../../lib/utils"
import BookingDialogContent from "@/app/providers/BookingDialogContent"

const BookingDialog = ({
  bookingType,
  dialogOptions,
  dialogId,
  locale,
}: {
  bookingType: BookingType
  dialogOptions: {
    title: string
    buttonText?: string
    buttonClassName?: string
  }
  locale: string
  dialogId?: string
}) => {
  const [open, setOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(false)

  const { bookingData, setBookingData } = useBooking()
  const {
    dialogData,
    setDialogId,
    isLoading,
    openBookingDialog,
    closeBookingDialog,
  } = useDialog()

  // Set dialog ID when component mounts
  React.useEffect(() => {
    setDialogId(dialogId || null)
  }, [dialogId, setDialogId])

  const handleOpenChange = (open: boolean) => {
    setOpen(open)

    // Sync with DialogProvider state
    if (open) {
      openBookingDialog()
    } else {
      closeBookingDialog()
    }

    // Set source when page dialog opens
    if (open) {
      setBookingData(prev => ({ ...prev, source: "page" }))
    }

    // Reset booking data and payment step when dialog is closing
    if (!open) {
      setBookingData(initialBookingData)
      setPaymentStep(false)
      // Clear localStorage to ensure fresh start next time
      if (typeof window !== "undefined") {
        localStorage.removeItem("bookingData")
      }
    }
  }

  const buttonText =
    dialogOptions.buttonText ??
    getInternationalizedValue(dialogData?.cta, locale, "Reserve")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} key="order-dialog">
      <DialogTrigger asChild>
        <Button
          name="booking-button"
          size="lg"
          className={dialogOptions.buttonClassName}
          variant="secondary"
          disabled={isLoading}
        >
          {buttonText}
        </Button>
      </DialogTrigger>
      <BookingDialogContent
        bookingData={bookingData}
        title={dialogOptions.title}
        paymentStep={paymentStep}
        onBookingFormSubmit={submittedBookingData => {
          // Update booking data with the finalized data from the form
          setBookingData(submittedBookingData)
          setPaymentStep(true)
        }}
        onCancel={() => handleOpenChange(false)}
        bookingType={bookingType}
        locale={locale}
      />
    </Dialog>
  )
}

export default BookingDialog
