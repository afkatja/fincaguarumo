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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

import { Separator } from "@/components/ui/separator"
import PaymentMethods from "./PaymentMethods"
import Payment from "./Payment"

const BookingDialog = ({
  title,
  description,
  price,
}: {
  title: string
  description: string
  price: number
}) => {
  const [open, setOpen] = useState(false)
  const [participants, setParticipants] = useState(1)
  const [paymentStep, setPaymentStep] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<null | string>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="ml-auto">
          Reserve Now
        </Button>
      </DialogTrigger>
      {!paymentStep && (
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div>
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-col items-start w-full h-auto"
                    >
                      <span className="font-semibold uppercase text-[0.65rem]">
                        Select Date
                      </span>
                      <span className="font-normal">
                        {new Date().toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 max-w-[276px]">
                    <Calendar />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guests">Guests</Label>
                <Select onValueChange={val => setParticipants(Number(val))}>
                  <SelectTrigger className="h-auto">
                    <SelectValue
                      placeholder={
                        <div className="flex flex-col items-start">
                          <span className="font-semibold uppercase text-[0.65rem]">
                            Guests
                          </span>
                          <span className="font-normal">
                            {participants} adults
                          </span>
                        </div>
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 adult</SelectItem>
                    <SelectItem value="2">2 adults</SelectItem>
                    <SelectItem value="3">2 adults + 1 child</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <PaymentMethods onCheck={val => setPaymentMethod(val)} />
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
              <Button onClick={() => setPaymentStep(true)}>Reserve</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
      {paymentStep && (
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Payment price={price * participants} paymentMethod={paymentMethod} />
        </DialogContent>
      )}
    </Dialog>
  )
}

export default BookingDialog
