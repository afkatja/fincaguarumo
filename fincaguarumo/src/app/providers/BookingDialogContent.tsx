import React, { useRef } from "react"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RemoveScroll } from "react-remove-scroll"
import ProgressiveBookingForm from "@/components/booking/ProgressiveBookingForm"
import Payment from "../[locale]/(pages)/(payment)/Payment"
import { BookingType, BookingData } from "../../types"

interface BookingDialogContentProps {
  bookingData: Record<string, any>
  title?: string
  paymentStep: boolean
  onBookingFormSubmit: (bookingData: BookingData) => void
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
  const scrollableRef = useRef<HTMLDivElement>(null)
  if (!bookingData) return null

  const title = bookingData?.bookingDetails?.title ?? titleProp
  const description =
    bookingData?.bookingDetails?.description ??
    "Please fill in your booking details below."
  return (
    <>
      {!paymentStep ? (
        <DialogContent className="min-h-150 sm:max-w-150 dark:bg-linear-to-br dark:from-zinc-700 dark:to-sky-900">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <RemoveScroll shards={[scrollableRef]}>
            <ProgressiveBookingForm
              onSubmit={onBookingFormSubmit}
              onCancel={onCancel}
              bookingType={bookingType}
              locale={locale}
            />
          </RemoveScroll>
        </DialogContent>
      ) : (
        <DialogContent className="min-h-125 sm:max-w-125 dark:bg-linear-to-br dark:from-zinc-700 dark:to-sky-900">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <RemoveScroll shards={[scrollableRef]}>
            <Payment ref={scrollableRef} />
          </RemoveScroll>
        </DialogContent>
      )}
    </>
  )
}

export default BookingDialogContent
