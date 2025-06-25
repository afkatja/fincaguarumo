"use client"
import React, { useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

import Payment from "./(payment)/Payment"
import BookingForm from "./(payment)/BookingForm"
import { useBooking } from "../BookingProvider"
import { BookingType } from "../../../types"

const BookingDialog = ({
  bookingType,
  dialogOptions,
}: {
  bookingType: BookingType
  dialogOptions: { title: string; buttonText: string; buttonClassName?: string }
}) => {
  const [open, setOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(false)

  const { bookingData } = useBooking()

  const closeHandler = () => {
    setOpen(!open)
    setPaymentStep(false)
    // const autoplay = carouselApi?.plugins()?.autoplay

    // if (autoplay) {
    //   const playOrStop = autoplay.isPlaying() ? autoplay.stop : autoplay.play
    //   playOrStop()
    // }
  }

  if (!bookingData) {
    return null
  }

  const title = bookingData?.bookingDetails?.title ?? dialogOptions.title
  const description =
    bookingData?.bookingDetails?.description ??
    "Please fill in your booking details below."

  return (
    <Dialog open={open} onOpenChange={() => closeHandler()} key="order-dialog">
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={dialogOptions.buttonClassName}
          variant="secondary"
        >
          {dialogOptions.buttonText}
        </Button>
      </DialogTrigger>
      {!paymentStep && (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900 ">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <BookingForm
            onSubmit={() => setPaymentStep(true)}
            onCancel={() => setOpen(false)}
            bookingType={bookingType}
          />
        </DialogContent>
      )}
      {paymentStep && (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Payment />
        </DialogContent>
      )}
    </Dialog>
  )
}

export default BookingDialog
