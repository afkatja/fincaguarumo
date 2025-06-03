"use client"
import React, { useState } from "react"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useBooking } from "../../BookingProvider"
import { DialogFooter } from "@/components/ui/dialog"
import { BookingType, IBookingType } from "../../../../types"
import PriceCalculation, { calculateTotal } from "@/components/priceCalculation"
import DatePicker from "@/components/DatePicker"

const BookingForm = ({
  onSubmit,
  onCancel,
  bookingType,
}: {
  onSubmit: () => void
  onCancel: () => void
  bookingType: BookingType
}) => {
  const [activePopover, setActivePopover] = useState<string | null>(null)

  const { bookingData, setBookingData } = useBooking()

  return (
    <form
      className="grid gap-4 group"
      noValidate
      onSubmit={e => {
        e.preventDefault()
        setBookingData({
          ...bookingData,
          type: bookingType,
          bookingDetails: {
            ...bookingData.bookingDetails,
          },
        })
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

        {bookingType === IBookingType.villa ? (
          <div className="md:flex items-center">
            <div>
              <Label htmlFor="check-in">Check-in Date</Label>
              <DatePicker
                isOpen={activePopover === "check-in"}
                onClose={() => setActivePopover(null)}
                onOpen={() => setActivePopover("check-in")}
                onSelectDate={date => {
                  setBookingData({
                    ...bookingData,
                    bookingDetails: {
                      ...bookingData.bookingDetails,
                      checkIn: new Date(date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                    },
                  })
                  setActivePopover(null)
                }}
                label="Select date"
                selectedDate={bookingData.bookingDetails.checkIn}
              />
            </div>

            <div className="ml-4">
              <Label htmlFor="check-out">Check-out Date</Label>
              <DatePicker
                label="Select date"
                selectedDate={bookingData.bookingDetails.checkOut}
                isOpen={activePopover === "check-out"}
                onClose={() => setActivePopover(null)}
                onOpen={() => setActivePopover("check-out")}
                onSelectDate={date => {
                  setBookingData({
                    ...bookingData,
                    bookingDetails: {
                      ...bookingData.bookingDetails,
                      checkOut: new Date(date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                    },
                  })
                  setActivePopover(null)
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <Label htmlFor="date">Tour Date</Label>
            <DatePicker
              isOpen={activePopover === "tour-date"}
              onClose={() => setActivePopover(null)}
              onOpen={() => setActivePopover("tour-date")}
              onSelectDate={date => {
                setBookingData({
                  ...bookingData,
                  bookingDetails: {
                    ...bookingData.bookingDetails,
                    date: new Date(date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  },
                })
                setActivePopover(null)
              }}
              label="Select date"
              selectedDate={bookingData.bookingDetails.date}
            />
          </>
        )}

        <div className="grid gap-2 mt-4">
          <Label htmlFor="guests">Guests</Label>
          <Select
            onValueChange={val =>
              setBookingData({
                ...bookingData,
                bookingDetails: {
                  ...bookingData.bookingDetails,
                  guests: val,
                  totalPrice: calculateTotal(
                    bookingData.bookingDetails.price,
                    val,
                    bookingType
                  ),
                },
              })
            }
          >
            <SelectTrigger className="h-auto border border-zinc-300">
              <SelectValue
                placeholder={
                  <div className="flex flex-col items-start">
                    <span className="font-semibold uppercase text-[0.65rem]">
                      Guests
                    </span>
                    <span className="font-normal">
                      {bookingData.bookingDetails.guests} adults
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

        <DialogFooter className="flex-wrap">
          <PriceCalculation
            price={bookingData.bookingDetails.price}
            guests={bookingData.bookingDetails.guests}
            bookingType={bookingType}
          />
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
      </div>
    </form>
  )
}

export default BookingForm
