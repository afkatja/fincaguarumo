import { useState, useRef } from "react"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RemoveScroll } from "react-remove-scroll"
import ProgressiveBookingForm from "@/components/booking/ProgressiveBookingForm"
import Payment from "../[locale]/(pages)/(payment)/Payment"
import { useBookingCore } from "./BookingCoreProvider"
import { useDialog } from "./DialogProvider"

interface BookingDialogContentProps {
  title?: string
  locale: string
}

const BookingDialogContent = ({
  title: titleProp,
  locale,
}: BookingDialogContentProps) => {
  const [paymentStep, setPaymentStep] = useState(false)
  const { state } = useBookingCore()
  const scrollableRef = useRef<HTMLDivElement>(null)
  const { closeBookingDialog } = useDialog()

  const title = state.data.bookingDetails.title || titleProp
  const description =
    state.data.bookingDetails.description ||
    "Please fill in your booking details below."
  return (
    <DialogContent className="min-h-125 sm:max-w-125 dark:bg-linear-to-br dark:from-zinc-700 dark:to-sky-900">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <RemoveScroll shards={[scrollableRef]}>
        {!paymentStep ? (
          <ProgressiveBookingForm
            onCancel={closeBookingDialog}
            locale={locale}
            onSubmit={() => setPaymentStep(true)}
          />
        ) : (
          <Payment ref={scrollableRef} />
        )}
      </RemoveScroll>
    </DialogContent>
  )
}

export default BookingDialogContent
