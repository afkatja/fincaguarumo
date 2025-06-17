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
import Input from "../../../../components/Input"

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
          <Input
            id="name"
            type="text"
            required
            labelText="Your name *"
            errorMessage="Please enter your name"
            placeholder="Jane Doe"
            onChangeHandler={(e: React.ChangeEvent<HTMLInputElement>) =>
              setBookingData({
                ...bookingData,
                customerDetails: {
                  ...bookingData.customerDetails,
                  name: e.target.value,
                },
              })
            }
          />
        </div>
        <div className="my-1">
          <Input
            id="email"
            type="email"
            required
            errorMessage="Please enter a valid email address"
            labelText="Your email *"
            placeholder="jane@doe.com"
            pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
            onChangeHandler={(e: React.ChangeEvent<HTMLInputElement>) =>
              setBookingData({
                ...bookingData,
                customerDetails: {
                  ...bookingData.customerDetails,
                  email: e.target.value,
                },
              })
            }
          />
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
              <Button
                variant="outline"
                onClick={() => {
                  setBookingData(null)
                  localStorage.removeItem("bookingData")
                  onCancel()
                }}
              >
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
