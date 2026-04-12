"use client"
import { memo, useEffect } from "react"
import { Dialog } from "@/components/ui/dialog"

import { useDialog } from "../../providers/DialogProvider"
import { getInternationalizedValue } from "../../../lib/utils"
import BookingDialogContent from "@/app/providers/BookingDialogContent"
import BookingDialogTrigger from "../../../components/booking/BookingDialogTrigger"
import { BookingType } from "../../../types"
import { bookingEventBus } from "@/app/providers/BookingEventBus"

const BookingDialog = ({
  bookingType,
  dialogOptions,
  dialogId,
  locale,
  hideTrigger = false,
}: {
  bookingType?: BookingType
  dialogOptions: {
    title: string
    buttonText?: string
    buttonClassName?: string
    buttonDataId?: string
  }
  locale: string
  dialogId?: string
  hideTrigger?: boolean
}) => {
  const {
    dialogData,
    setDialogId,
    currentBookingType,
    isBookingDialogOpen,
    activeDialogId,
  } = useDialog()

  // Set dialog ID when component mounts
  useEffect(() => {
    if (dialogId) {
      setDialogId(dialogId)
    }
  }, [dialogId, setDialogId])

  const handleOpenChange = (open: boolean) => {
    const effectiveBookingType = bookingType ?? currentBookingType

    if (!effectiveBookingType) return

    if (open) {
      bookingEventBus.emit({
        type: "DIALOG_OPEN_REQUESTED",
        payload: {
          bookingType: effectiveBookingType,
          dialogId,
          source: "page",
        },
      })
    } else {
      bookingEventBus.emit({
        type: "DIALOG_CLOSE_REQUESTED",
        payload: {
          bookingType: effectiveBookingType,
          source: "page",
        },
      })
    }
  }

  const buttonText =
    dialogOptions.buttonText ??
    getInternationalizedValue(dialogData?.cta, locale, "Reserve")

  return (
    <Dialog
      open={isBookingDialogOpen && activeDialogId === dialogId}
      onOpenChange={handleOpenChange}
      key={dialogId}
    >
      {!hideTrigger && (
        <BookingDialogTrigger
          bookingType={bookingType ?? currentBookingType ?? "villa"}
          buttonText={buttonText}
          className={dialogOptions.buttonClassName}
          dataId={dialogOptions.buttonDataId}
          dialogId={dialogId}
        />
      )}
      <BookingDialogContent title={dialogOptions.title} locale={locale} />
    </Dialog>
  )
}

export default memo(BookingDialog)
