import React, { useRef } from "react"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RemoveScroll } from "react-remove-scroll"
import BookingForm from "../[locale]/(pages)/(payment)/BookingForm"
import Payment from "../[locale]/(pages)/(payment)/Payment"
import { BookingType } from "../../types"

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
  const scrollableRef = useRef<HTMLDivElement>(null)
  if (!bookingData) return null

  const title = bookingData?.bookingDetails?.title ?? titleProp
  const description =
    bookingData?.bookingDetails?.description ??
    "Please fill in your booking details below."
  return (
    <>
      {!paymentStep ? (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-linear-to-br dark:from-zinc-700 dark:to-sky-900 ">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <RemoveScroll shards={[scrollableRef]}>
            <BookingForm
              onSubmit={onBookingFormSubmit}
              onCancel={onCancel}
              bookingType={bookingType}
              locale={locale}
              ref={scrollableRef}
            />
          </RemoveScroll>
        </DialogContent>
      ) : (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-linear-to-br dark:from-zinc-700 dark:to-sky-900">
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
