"use client"
import React, { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import PriceCalculation from "@/components/priceCalculation"
import DatePicker from "@/components/DatePicker"
import Input from "@/components/Input"
import { getInternationalizedValue, loadTranslations } from "@/lib/utils"
import calculateDuration from "@/lib/calculateDuration"
import calculateTotal from "@/lib/calculateTotal"
import { BookingType, BOOKING_TYPE } from "../../../../types"
import { useBooking } from "../../BookingProvider"
import { useDialog } from "../../DialogProvider"
import SelectGuestsOptions from "./SelectGuestsOptions"
import PhoneInput from "../../../../components/PhoneInput"

const BookingForm = ({
  onSubmit,
  onCancel,
  bookingType,
  locale,
}: {
  onSubmit: () => void
  onCancel: () => void
  bookingType: BookingType
  locale: string
}) => {
  const [activePopover, setActivePopover] = useState<string | null>(null)
  const [translations, setTranslations] = useState<{
    booking: Record<string, string>
  } | null>(null)

  const { bookingData, setBookingData } = useBooking()
  const { dialogData: dialog } = useDialog()

  useEffect(() => {
    const loadTranslationsData = async () => {
      const messages = await loadTranslations(locale)
      setTranslations(messages)
    }
    loadTranslationsData()
  }, [locale])

  const t = translations?.booking

  // Calculate duration based on check-in and check-out dates
  const duration = calculateDuration(
    bookingData.bookingDetails.checkIn,
    bookingData.bookingDetails.checkOut,
    locale
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
              duration
            ).total,
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
            labelText={t?.nameLabel || "Your name"}
            errorMessage={t?.nameError || "Please enter your name"}
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
            errorMessage={t?.emailError || "Please enter a valid email address"}
            labelText={t?.emailLabel || "Your email *"}
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
            errorMessage={t?.phoneError || "Please enter a valid phone number"}
            labelText={t?.phoneLabel || "Your phone number *"}
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
          <div className="md:grid md:grid-cols-2 gap-2">
            <DatePicker
              isOpen={activePopover === "check-in"}
              onClose={() => setActivePopover(null)}
              onOpen={() => setActivePopover("check-in")}
              onSelectDate={date => {
                setBookingData({
                  ...bookingData,
                  bookingDetails: {
                    ...bookingData.bookingDetails,
                    checkIn: new Date(date).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  },
                })
                setActivePopover(null)
              }}
              label={t?.checkinDate || "Check-in date"}
              selectedDate={bookingData.bookingDetails.checkIn}
            />

            <div className="ml-4 md:ml-0">
              <DatePicker
                label={t?.checkoutDate || "Check-out date"}
                selectedDate={bookingData.bookingDetails.checkOut}
                isOpen={activePopover === "check-out"}
                onClose={() => setActivePopover(null)}
                onOpen={() => setActivePopover("check-out")}
                onSelectDate={date => {
                  setBookingData({
                    ...bookingData,
                    bookingDetails: {
                      ...bookingData.bookingDetails,
                      checkOut: new Date(date).toLocaleDateString(locale, {
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
                    date: new Date(date).toLocaleDateString(locale, {
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
          />
          <div className="mt-5 flex justify-end gap-2 w-full flex-none">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // setBookingData(null)
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
