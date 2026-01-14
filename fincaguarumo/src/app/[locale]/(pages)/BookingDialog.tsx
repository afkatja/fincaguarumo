"use client"
import React, { useState } from "react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

import { useBooking } from "../../providers/BookingProvider"
import { useDialog } from "../../providers/DialogProvider"
import { BookingType, initialBookingData } from "../../../types"
import { getInternationalizedValue } from "../../../lib/utils"
import BookingDialogContent from "../../providers/BookingDialogContent"

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
  const { dialogData, setDialogId, isLoading } = useDialog()

  // Set dialog ID when component mounts
  React.useEffect(() => {
    setDialogId(dialogId || null)
  }, [dialogId, setDialogId])

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
    setOpen(!open)
    setPaymentStep(false)
  }

  const buttonText =
    dialogOptions.buttonText ??
    getInternationalizedValue(dialogData?.cta, locale, "Reserve")

  return (
    <Dialog open={open} onOpenChange={() => closeHandler()} key="order-dialog">
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
        onBookingFormSubmit={() => setPaymentStep(true)}
        onCancel={closeHandler}
        bookingType={bookingType}
        locale={locale}
      />
    </Dialog>
  )
}

export default BookingDialog
