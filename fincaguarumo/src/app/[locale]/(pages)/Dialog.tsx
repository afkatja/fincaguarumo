import React, { useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogBody,
  DialogFooter,
  // DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

import { Button } from "@/components/ui/button"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import Icon from "@/components/Icon"
import Datepicker from "@/components/ui/datepicker"
import SelectBox from "../../../components/ui/selectBox"
import { getInternationalizedValue } from "../../../lib/utils"

type IField = {
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
  title,
  description,
  price,
  buttonText,
  dialog,
  locale,
}: {
  title: string
  description: string
  price: number
  buttonText?: string
  locale: string
  dialog?: IDialog
}) => {
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState(1)
  const [selectedDate, setSelectedDate] = useState(new Date())
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="ml-auto">
          {buttonText ||
            getInternationalizedValue(dialog?.cta, locale, "Reserve")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div>
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Datepicker
                selectedDate={selectedDate}
                onSelectDate={date => setSelectedDate(date)}
                label={getInternationalizedValue(dialog?.date, locale, "Date")}
                placeholder={getInternationalizedValue(
                  dialog?.selectDate,
                  locale,
                  "Select date"
                )}
              />
            </div>
            <div className="grid gap-2">
              <SelectBox
                label={getInternationalizedValue(
                  dialog?.guests,
                  locale,
                  "Guests"
                )}
                placeholder={
                  <div className="flex flex-col items-start">
                    <span className="font-semibold uppercase text-[0.65rem]">
                      {getInternationalizedValue(
                        dialog?.guests,
                        locale,
                        "Guests"
                      )}
                    </span>
                    <span className="font-normal">
                      {participants}{" "}
                      {participants === 1
                        ? getInternationalizedValue(
                            dialog?.adult,
                            locale,
                            "adult"
                          )
                        : getInternationalizedValue(
                            dialog?.adults,
                            locale,
                            "adults"
                          )}
                    </span>
                  </div>
                }
                onValueChange={val => setParticipants(Number(val))}
                values={[
                  {
                    val: "1",
                    text: `1 ${getInternationalizedValue(dialog?.adult, locale, "adult")}`,
                  },
                  {
                    val: "2",
                    text: `2 ${getInternationalizedValue(dialog?.adults, locale, "adults")}`,
                  },
                  {
                    val: "3",
                    text: `3 ${getInternationalizedValue(dialog?.adults, locale, "adults")}`,
                  },
                  {
                    val: "4",
                    text: `4 ${getInternationalizedValue(dialog?.adults, locale, "adults")}`,
                  },
                  {
                    val: "other",
                    text: getInternationalizedValue(
                      dialog?.other,
                      locale,
                      "Other"
                    ),
                  },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment">
                {getInternationalizedValue(
                  dialog?.paymentMethod,
                  locale,
                  "Payment Method"
                )}
              </Label>
              <RadioGroup defaultValue="card">
                <div className="flex items-center gap-4">
                  <Label
                    id="card"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem id="card" value="card" />
                    <Icon icon="CreditCard" className="h-6 w-6" />
                    {getInternationalizedValue(
                      dialog?.creditCard,
                      locale,
                      "Credit Card"
                    )}
                  </Label>
                  <Label
                    id="paypal"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem id="paypal" value="paypal" />
                    <Icon icon="WalletCards" className="h-6 w-6" />
                    {getInternationalizedValue(
                      dialog?.paypal,
                      locale,
                      "PayPal"
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </form>
        </div>
        <DialogFooter className="flex-wrap">
          <div className="grid gap-2 flex-none w-full">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">
                ${price} x {participants}{" "}
                {getInternationalizedValue(dialog?.people, locale, "people")}
              </div>
              <div>${price * participants}</div>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <div>
                {getInternationalizedValue(dialog?.total, locale, "Total")}
              </div>
              <div>${price * participants}</div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2 w-full flex-none">
            <div>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {getInternationalizedValue(dialog?.cancel, locale, "Cancel")}
              </Button>
            </div>
            <Button>
              {getInternationalizedValue(dialog?.ok, locale, "Reserve")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BookingDialog
