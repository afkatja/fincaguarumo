"use client"
import React, { use, useEffect, useState } from "react"
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
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useBooking } from "../../BookingProvider"
import { DialogFooter } from "@/components/ui/dialog"

const BookingForm = ({
  onSubmit,
  onCancel,
}: {
  onSubmit: () => void
  onCancel: () => void
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false)

  const { bookingData, setBookingData } = useBooking()

  return (
    <form
      className="grid gap-4 group"
      noValidate
      onSubmit={e => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid gap-2">
        <div className="my-1">
          <Label
            htmlFor="name"
            className="block input-required:outline-destructive"
          >
            Your name *
          </Label>
          <input
            id="name"
            type="text"
            required
            placeholder="Jane Doe"
            onBlur={e =>
              setBookingData({
                ...bookingData,
                customerDetails: {
                  ...bookingData.customerDetails,
                  name: e.target.value,
                },
              })
            }
            className="w-full mt-2 p-1 pl-4 rounded-sm outline outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer text-zinc-900"
          />
          <span className="mt-2 hidden text-sm text-destructive peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
            Please enter your name
          </span>
        </div>
        <div className="my-1">
          <Label className="block required:outline-destructive" htmlFor="email">
            Your email *
          </Label>
          <input
            id="email"
            type="email"
            required
            onBlur={e =>
              setBookingData({
                ...bookingData,
                customerDetails: {
                  ...bookingData.customerDetails,
                  email: e.target.value,
                },
              })
            }
            placeholder="jane@doe.com"
            className="w-full mt-2 p-1 pl-4 rounded-sm outline outline-1 outline-zinc-300 invalid:[&:not(:placeholder-shown):not(:focus)]:outline-destructive peer text-zinc-900"
            pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
          />
          <span className="mb-2 hidden text-sm text-destructive peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
            Please enter a valid email address
          </span>
        </div>
        <Label htmlFor="date">Date</Label>
        <Popover open={popoverOpen}>
          {popoverOpen && (
            <div
              className="overlay fixed top-0 left-0 w-[100vw] h-[100vh]"
              onClick={() => setPopoverOpen(false)}
            ></div>
          )}
          <PopoverTrigger asChild onClick={() => setPopoverOpen(true)}>
            <Button
              variant="outline"
              className="flex-col items-start w-full h-auto dark:bg-zinc-600 outline-none border-none hover:dark:text-zinc-50"
            >
              <span className="font-semibold uppercase text-[0.65rem]">
                Select Date
              </span>
              <span className="font-normal">
                {bookingData.tourDetails.date}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 max-w-[276px]">
            <Calendar
              mode="single"
              disabled={(date: Date) => date < new Date()}
              onSelect={(_, selectedDay) => {
                setBookingData({
                  ...bookingData,
                  tourDetails: {
                    ...bookingData.tourDetails,
                    date: new Date(selectedDay).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  },
                })
                setPopoverOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="guests">Guests</Label>
        <Select
          onValueChange={val =>
            setBookingData({
              ...bookingData,
              tourDetails: { ...bookingData.tourDetails, guests: val },
            })
          }
        >
          <SelectTrigger className="h-auto">
            <SelectValue
              placeholder={
                <div className="flex flex-col items-start">
                  <span className="font-semibold uppercase text-[0.65rem]">
                    Guests
                  </span>
                  <span className="font-normal">
                    {bookingData.tourDetails.guests} adults
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
      {/* <div className="grid gap-2">
                <PaymentMethods onCheck={val => setPaymentMethod(val)} />
              </div> */}
      <DialogFooter className="flex-wrap">
        <div className="grid gap-2 flex-none w-full">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">
              ${bookingData.tourDetails.price} x{" "}
              {bookingData.tourDetails.guests} people
            </div>
            <div>
              $
              {Number(bookingData.tourDetails.price) *
                Number(bookingData.tourDetails.guests)}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-medium">
            <div>Total</div>
            <div>
              $
              {Number(bookingData.tourDetails.price) *
                Number(bookingData.tourDetails.guests)}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 w-full flex-none">
          <div>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          <Button
            type="submit"
            className="group-invalid:pointer-events-none group-invalid:opacity-30"
          >
            Reserve
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

export default BookingForm
