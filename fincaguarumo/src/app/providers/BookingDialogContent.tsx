import { useState, useRef, useEffect } from "react"
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
import { bookingEventBus, BookingEvent } from "./BookingEventBus"

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

  // Listen for dialog close events to reset payment step
  useEffect(() => {
    const handleBookingEvent = (event: BookingEvent) => {
      if (event.type === "DIALOG_CLOSE_REQUESTED") {
        setPaymentStep(false)
      }
    }

    const unsubscribe = bookingEventBus.subscribe(handleBookingEvent)
    return unsubscribe
  }, [])

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
            onCancel={() => {
              setPaymentStep(false)
              closeBookingDialog()
            }}
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
