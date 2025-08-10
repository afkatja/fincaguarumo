"use client"
import React, { useState } from "react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

import { useBooking } from "../BookingProvider"
import { useDialog } from "../DialogProvider"
import { BookingType } from "../../../types"
import { getInternationalizedValue } from "../../../lib/utils"
import BookingDialogContent from "./BookingDialogContent"

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
  dialogId,
  locale,
}: {
  bookingType: BookingType
  dialogOptions: { title: string; buttonText: string; buttonClassName?: string }
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
      <BookingDialogContent
        bookingData={bookingData}
        title={dialogOptions.title}
        paymentStep={paymentStep}
        onBookingFormSubmit={() => setPaymentStep(true)}
        onCancel={closeHandler}
        bookingType={bookingType}
        locale={locale}
      />
    </Dialog>
  )
}

export default BookingDialog
