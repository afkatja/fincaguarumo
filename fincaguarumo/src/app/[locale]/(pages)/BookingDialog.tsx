"use client"
import { memo, useEffect, useState } from "react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

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
}: {
  bookingType: BookingType
  dialogOptions: {
    title: string
    buttonText?: string
    buttonClassName?: string
    buttonDataId?: string
  }
  locale: string
  dialogId?: string
}) => {
  const {
    dialogData,
    setDialogId,
    isLoading,
    closeBookingDialog,
    isBookingDialogOpen,
  } = useDialog()

  // Set dialog ID when component mounts
  useEffect(() => {
    if (dialogId) {
      setDialogId(dialogId)
    }
  }, [dialogId, setDialogId])

  const handleOpenChange = (open: boolean) => {
    if (open) {
      bookingEventBus.emit({
        type: "DIALOG_OPEN_REQUESTED",
        payload: {
          bookingType,
          source: "page",
        },
      })
    } else {
      closeBookingDialog()
    }
  }

  const buttonText =
    dialogOptions.buttonText ??
    getInternationalizedValue(dialogData?.cta, locale, "Reserve")

  return (
    <Dialog
      open={isBookingDialogOpen}
      onOpenChange={handleOpenChange}
      key={dialogId}
    >
      <BookingDialogTrigger
        bookingType={bookingType}
        buttonText={buttonText}
        className={dialogOptions.buttonClassName}
        dataId={dialogOptions.buttonDataId}
      />
      <BookingDialogContent title={dialogOptions.title} locale={locale} />
    </Dialog>
  )
}

export default memo(BookingDialog)
