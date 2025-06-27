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

const BookingDialog = ({
  title,
  description,
  price,
  buttonText,
}: {
  title: string
  description: string
  price: number
  buttonText: string
}) => {
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState(1)
  const [selectedDate, setSelectedDate] = useState(new Date())
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="ml-auto">
          {buttonText}
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
                label="Date"
                placeholder="Select date"
              />
            </div>
            <div className="grid gap-2">
              <SelectBox
                label="Guests"
                placeholder={
                  <div className="flex flex-col items-start">
                    <span className="font-semibold uppercase text-[0.65rem]">
                      Guests
                    </span>
                    <span className="font-normal">{participants} adults</span>
                  </div>
                }
                onValueChange={val => setParticipants(Number(val))}
                values={[
                  { val: "1", text: "1 adult" },
                  { val: "2", text: "2 adults" },
                  { val: "3", text: "3 adults" },
                  { val: "4", text: "4 adults" },
                  { val: "other", text: "Other" },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment">Payment Method</Label>
              <RadioGroup defaultValue="card">
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="card"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem id="card" value="card" />
                    <Icon icon="CreditCard" className="h-6 w-6" />
                    Credit Card
                  </Label>
                  <Label
                    htmlFor="paypal"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem id="paypal" value="paypal" />
                    <Icon icon="WalletCards" className="h-6 w-6" />
                    PayPal
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
                ${price} x {participants} people
              </div>
              <div>${price * participants}</div>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <div>Total</div>
              <div>${price * participants}</div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2 w-full flex-none">
            <div>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
            <Button>Reserve</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BookingDialog
