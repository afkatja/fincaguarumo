import React from "react"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import Payment from "./(payment)/Payment"
import BookingForm from "./(payment)/BookingForm"
import { BookingType } from "../../../types"

interface BookingDialogContentProps {
  bookingData: Record<string, any>
  title?: string
  paymentStep: boolean
  onBookingFormSubmit: () => void
  onCancel: () => void
  bookingType: BookingType
  locale: string
}

const BookingDialogContent = ({
  bookingData,
  title: titleProp,
  paymentStep,
  onBookingFormSubmit,
  onCancel,
  bookingType,
  locale,
}: BookingDialogContentProps) => {
  if (!bookingData) return null

  const title = bookingData?.bookingDetails?.title ?? titleProp
  const description =
    bookingData?.bookingDetails?.description ??
    "Please fill in your booking details below."
  return (
    <>
      {!paymentStep ? (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900 ">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <BookingForm
            onSubmit={onBookingFormSubmit}
            onCancel={onCancel}
            bookingType={bookingType}
            locale={locale}
          />
        </DialogContent>
      ) : (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Payment />
        </DialogContent>
      )}
    </>
  )
}

export default BookingDialogContent
