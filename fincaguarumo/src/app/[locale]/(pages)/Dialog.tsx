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

const BookingDialog = () => {
  const [open, setOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(false)

  const { bookingData } = useBooking()

  const closeHandler = () => {
    setOpen(!open)
    setPaymentStep(false)
  }

  // const getFormData = () => {
  //   return Object.keys(fields).reduce(
  //     (formData, name) => ({
  //       ...formData,
  //       [name]: fields[name],
  //     }),
  //     {}
  //   )
  // }

  const { title, description } = bookingData.tourDetails

  return (
    <Dialog open={open} onOpenChange={() => closeHandler()} key="order-dialog">
      <DialogTrigger asChild>
        <Button size="lg" className="ml-auto">
          Reserve Now
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
