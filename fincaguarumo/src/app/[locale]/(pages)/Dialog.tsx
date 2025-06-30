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
import { useDialog } from "../DialogProvider"
import { BookingType } from "../../../types"
import { getInternationalizedValue } from "../../../lib/utils"

export type IField = {
  _key: string
  value: string
}

export type IDialog = {
  cta?: IField[]
  date?: IField[]
  selectDate?: IField[]
  guests?: IField[]
  adults?: IField[]
  adult?: IField[]
  child?: IField[]
  other?: IField[]
  paymentMethod?: IField[]
  creditCard?: IField[]
  paypal?: IField[]
  people?: IField[]
  total?: IField[]
  ok?: IField[]
  cancel?: IField[]
}

const BookingDialog = ({
  bookingType,
  dialogOptions,
  price,
  dialogId,
  locale,
}: {
  bookingType: BookingType
  dialogOptions: { title: string; buttonText: string; buttonClassName?: string }
  price: number
  locale: string
  dialogId?: string
}) => {
  const [open, setOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(false)

  const { bookingData } = useBooking()
  const { dialogData, setDialogId, isLoading } = useDialog()

  // Set dialog ID when component mounts
  React.useEffect(() => {
    setDialogId(dialogId || null)
  }, [dialogId, setDialogId])

  const closeHandler = () => {
    setOpen(!open)
    setPaymentStep(false)
  }

  if (!bookingData) {
    return null
  }

  const title = bookingData?.bookingDetails?.title ?? dialogOptions.title
  const description =
    bookingData?.bookingDetails?.description ??
    "Please fill in your booking details below."
  const buttonText =
    dialogOptions.buttonText ||
    getInternationalizedValue(dialogData?.cta, locale, "Reserve")

  return (
    <Dialog open={open} onOpenChange={() => closeHandler()} key="order-dialog">
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={dialogOptions.buttonClassName}
          variant="secondary"
          disabled={isLoading}
        >
          {buttonText}
        </Button>
      </DialogTrigger>
      {!paymentStep ? (
        <DialogContent className="min-h-[500px] sm:max-w-[500px] dark:bg-gradient-to-br dark:from-zinc-700 dark:to-sky-900 ">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <BookingForm
            onSubmit={() => setPaymentStep(true)}
            onCancel={() => setOpen(false)}
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
    </Dialog>
  )
}

export default BookingDialog
