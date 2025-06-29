"use client"
import React, { useState } from "react"
import { Label } from "@/components/ui/label"

import SelectBox from "@/components/ui/selectBox"

import { Button } from "@/components/ui/button"
import { useBooking } from "../../BookingProvider"
import { DialogFooter } from "@/components/ui/dialog"
import { BookingType, IBookingType } from "../../../../types"
import PriceCalculation, { calculateTotal } from "@/components/priceCalculation"
import DatePicker from "@/components/DatePicker"
import Input from "@/components/Input"
import { getInternationalizedValue } from "../../../../lib/utils"
import { IField } from "../Dialog"
import SelectGuestsOptions from "./SelectGuestsOptions"

const BookingForm = ({
  onSubmit,
  onCancel,
  bookingType,
  locale,
  dialog,
}: {
  onSubmit: () => void
  onCancel: () => void
  bookingType: BookingType
  locale: string
  dialog: Record<string, IField[]>
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
            labelText={getInternationalizedValue(
              dialog?.nameLabel,
              locale,
              "Your name"
            )}
            errorMessage={getInternationalizedValue(
              dialog?.nameError,
              "Please enter your name"
            )}
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
            errorMessage={getInternationalizedValue(
              dialog?.emailError,
              locale,
              "Please enter a valid email address"
            )}
            labelText={getInternationalizedValue(
              dialog?.emailLabel,
              locale,
              "Your email *"
            )}
            placeholder="jane@doe.com"
            pattern="^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$"
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
                label={getInternationalizedValue(
                  dialog?.checkinDate,
                  locale,
                  "Check-in date"
                )}
                selectedDate={bookingData.bookingDetails.checkIn}
              />
            </div>

            <div className="ml-4">
              <DatePicker
                label={getInternationalizedValue(
                  dialog?.checkoutDate,
                  locale,
                  "Check-out date"
                )}
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
              label={getInternationalizedValue(
                dialog?.selectDate,
                locale,
                "Select date"
              )}
              selectedDate={bookingData.bookingDetails.date}
            />
          </>
        )}

        <div className="grid gap-2 mt-4">
          <SelectGuestsOptions
            locale={locale}
            guests={bookingData.bookingDetails.guests}
            onChange={val =>
              setBookingData({
                ...bookingData,
                bookingDetails: {
                  ...bookingData.bookingDetails,
                  guests: val,
                },
              })
            }
          />
        </div>

        <DialogFooter className="flex-wrap">
          <PriceCalculation
            price={bookingData.bookingDetails.price}
            guests={bookingData.bookingDetails.guests}
            bookingType={bookingType}
            locale={locale}
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
                {getInternationalizedValue(dialog?.cancel, locale, "Cancel")}
              </Button>
            </div>
            <Button
              type="submit"
              className="group-invalid:pointer-events-none group-invalid:opacity-30"
            >
              {getInternationalizedValue(dialog?.ok, locale, "Reserve")}
            </Button>
          </div>
        </DialogFooter>
      </div>
    </form>
  )
}

export default BookingForm
