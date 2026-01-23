"use client"
import React, { useState } from "react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import PriceCalculation from "@/components/priceCalculation"
import DatePicker from "@/components/DatePicker"
import Input from "@/components/Input"
import { getInternationalizedValue } from "@/lib/utils"
import { useTranslations } from "next-intl"
import calculateDuration from "@/lib/calculateDuration"
import calculateTotal from "@/lib/calculateTotal"
import {
  BookingType,
  BOOKING_TYPE,
  initialBookingData,
} from "../../../../types"
import { useBooking } from "../../../providers/BookingProvider"
import { useDialog } from "../../../providers/DialogProvider"
import SelectGuestsOptions from "./SelectGuestsOptions"
import PhoneInput from "../../../../components/PhoneInput"
import BookingCalendar from "../../../../components/BookingCalendar"

const BookingForm = ({
  onSubmit,
  onCancel,
  bookingType,
  locale,
  ...props
}: {
  onSubmit: () => void
  onCancel: () => void
  bookingType: BookingType
  locale: string
  [prop: string]: any
}) => {
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string>("")

  const { bookingData, setBookingData } = useBooking()
  const { dialogData: dialog } = useDialog()

  const t = useTranslations("booking")

  // Calculate duration based on check-in and check-out dates
  const duration = calculateDuration(
    bookingData.bookingDetails.checkIn,
    bookingData.bookingDetails.checkOut,
  )

  return (
    <form
      className="grid gap-4 group"
      noValidate
      onSubmit={e => {
        e.preventDefault()
        setBookingData({
          ...bookingData,
          bookingDetails: {
            ...bookingData.bookingDetails,
            type: bookingType,
            totalPrice: calculateTotal(
              bookingData.bookingDetails.price,
              bookingData.bookingDetails.guests,
              bookingType,
              duration,
            ).total,
          },
        })

        onSubmit()
      }}
      {...props}
    >
      <div className="grid gap-2">
        <div className="my-1">
          <Input
            id="name"
            type="text"
            required
            labelText={t("nameLabel", { defaultValue: "Your name" })}
            errorMessage={t("nameError", {
              defaultValue: "Please enter your name",
            })}
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
            errorMessage={t("emailError", {
              defaultValue: "Please enter a valid email address",
            })}
            labelText={t("emailLabel", { defaultValue: "Your email *" })}
            placeholder="jane@doe.com"
            pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
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
        <div className="my-1">
          <PhoneInput
            id="phone"
            required
            defaultCountry={"CR"}
            errorMessage={t("phoneError", {
              defaultValue: "Please enter a valid phone number",
            })}
            labelText={t("phoneLabel", { defaultValue: "Your phone number *" })}
            placeholder="12345678"
            pattern="^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$"
            onChange={(value: string) =>
              setBookingData({
                ...bookingData,
                customerDetails: {
                  ...bookingData.customerDetails,
                  phoneNumber: value,
                },
              })
            }
          />
        </div>

        {bookingType === BOOKING_TYPE.villa ? (
          <BookingCalendar
            onSelectDate={(date: Date, type: string) => {
              setDateError("")
              if (type === "check-in") {
                const checkInDate = new Date(date)
                const checkOutDate = new Date(date)
                checkOutDate.setDate(checkOutDate.getDate() + 1)
                setBookingData({
                  ...bookingData,
                  bookingDetails: {
                    ...bookingData.bookingDetails,
                    checkIn: checkInDate,
                    checkOut:
                      bookingData.bookingDetails.checkOut &&
                      bookingData.bookingDetails.checkOut.getTime() >
                        checkInDate.getTime()
                        ? bookingData.bookingDetails.checkOut
                        : checkOutDate,
                  },
                })
              } else {
                const newCheckOut = new Date(date)
                const checkInTime = bookingData.bookingDetails.checkIn.getTime()
                const checkOutTime = newCheckOut.getTime()

                if (checkOutTime <= checkInTime) {
                  setDateError(
                    t("checkOutAfterCheckIn", {
                      defaultValue:
                        "Check-out date must be after check-in date",
                    }),
                  )
                  return
                }

                setBookingData({
                  ...bookingData,
                  bookingDetails: {
                    ...bookingData.bookingDetails,
                    checkOut: newCheckOut,
                  },
                })
              }
            }}
            selectedDates={{
              checkIn: bookingData.bookingDetails.checkIn,
              checkOut: bookingData.bookingDetails.checkOut,
            }}
            labels={{
              checkinDate: t("checkinDate", { defaultValue: "Check-in date" }),
              checkoutDate: t("checkoutDate", {
                defaultValue: "Check-out date",
              }),
            }}
            error={dateError}
          />
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
                    date,
                  },
                })
                setActivePopover(null)
              }}
              label={getInternationalizedValue(
                dialog?.selectDate,
                locale,
                "Select date",
              )}
              selectedDate={bookingData.bookingDetails.date}
            />
          </>
        )}

        <div className="grid gap-2 my-4">
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
            t={t}
            duration={duration}
            currency={bookingData.bookingDetails.currency}
          />
          <div className="mt-5 flex justify-end gap-2 w-full flex-none">
            <div>
              <Button
                name="booking-cancel-button"
                type="button"
                variant="outline"
                onClick={() => {
                  setBookingData(initialBookingData)
                  localStorage.removeItem("bookingData")
                  onCancel()
                }}
              >
                {getInternationalizedValue(dialog?.cancel, locale, "Cancel")}
              </Button>
            </div>
            <Button
              name="booking-submit-button"
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
