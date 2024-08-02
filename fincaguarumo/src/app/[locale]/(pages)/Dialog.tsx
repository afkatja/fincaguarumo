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

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import Icon from "@/components/Icon"

const BookingDialog = ({
  title,
  description,
  price,
}: {
  title: string
  description: string
  price: number
}) => {
  const [participants, setParticipants] = useState(1)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="ml-auto">
          Reserve Now
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
              <Label htmlFor="payment">Payment Method</Label>
              <RadioGroup defaultValue="card">
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="card"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem id="card" value="card" />
                    <Icon icon="Credit" className="h-6 w-6" />
                    Credit Card
                  </Label>
                  <Label
                    htmlFor="paypal"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RadioGroupItem id="paypal" value="paypal" />
                    <Icon icon="Wallet" className="h-6 w-6" />
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
              <Button variant="outline">Cancel</Button>
            </div>
            <Button>Reserve</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BookingDialog
