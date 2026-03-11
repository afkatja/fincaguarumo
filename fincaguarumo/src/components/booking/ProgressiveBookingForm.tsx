import { formatCurrency } from "@/lib/currency"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import VillaPriceCalculation from "@/components/VillaPriceCalculation"
import TourPriceCalculation from "@/components/TourPriceCalculation"
import Input from "@/components/Input"
import PhoneInput from "@/components/PhoneInput"
import BookingCalendar from "@/components/BookingCalendar"
import DatePicker from "@/components/DatePicker"
import SelectGuestsOptions from "@/app/[locale]/(pages)/(payment)/SelectGuestsOptions"
import { getInternationalizedValue } from "@/lib/utils"
import { useTranslations } from "next-intl"
import calculateDuration from "@/lib/calculateDuration"
import calculateTotal, { calculateTotalWithRules } from "@/lib/calculateTotal"
import { getDefaultBasePrice, getLowestPrice } from "@/lib/pricingEngine"
import {
  BookingType,
  BOOKING_TYPE,
  initialBookingData,
  BookingData,
} from "@/types"
import { useBooking } from "@/app/providers/BookingProvider"
import { useDialog } from "@/app/providers/DialogProvider"
import BookingProgressIndicator, {
  BookingStep,
} from "./BookingProgressIndicator"
import AvailabilityPreview from "./AvailabilityPreview"

interface ProgressiveBookingFormProps {
  onSubmit: (bookingData: BookingData) => void
  onCancel: () => void
  bookingType: BookingType
  locale: string
  className?: string
}

export default function ProgressiveBookingForm({
  onSubmit,
  onCancel,
  bookingType,
  locale,
  className = "",
}: ProgressiveBookingFormProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("dates")
  const [dateError, setDateError] = useState<string>("")
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isStepValid, setIsStepValid] = useState<Record<BookingStep, boolean>>({
    dates: false,
    personal: false,
    payment: false,
    complete: false,
  })
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const { bookingData, setBookingData } = useBooking()
  const { dialogData: dialog } = useDialog()
  const t = useTranslations("booking")

  // Calculate duration based on check-in and check-out dates
  const duration = calculateDuration(
    bookingData.bookingDetails.checkIn || undefined,
    bookingData.bookingDetails.checkOut || undefined,
  )

  // Define steps based on booking type
  const steps = [
    {
      id: "dates" as BookingStep,
      label: t("stepDates", { defaultValue: "Dates" }),
    },
    {
      id: "personal" as BookingStep,
      label: t("stepPersonal", { defaultValue: "Personal" }),
    },
    {
      id: "payment" as BookingStep,
      label: t("stepPayment", { defaultValue: "Payment" }),
    },
  ]

  // Validate current step
  useEffect(() => {
    const validateStep = () => {
      switch (currentStep) {
        case "dates":
          const datesValid =
            bookingType === BOOKING_TYPE.villa
              ? bookingData.bookingDetails.checkIn &&
                bookingData.bookingDetails.checkOut &&
                bookingData.bookingDetails.checkOut.getTime() >
                  bookingData.bookingDetails.checkIn.getTime() &&
                isAvailable === true // Must have confirmed availability
              : bookingData.bookingDetails.date
          setIsStepValid(prev => ({ ...prev, dates: !!datesValid }))
          break
        case "personal": {
          const personalValid =
            bookingData.customerDetails.name &&
            bookingData.customerDetails.email &&
            bookingData.customerDetails.phoneNumber
          setIsStepValid(prev => ({ ...prev, personal: !!personalValid }))
          break
        }
        case "payment": {
          setIsStepValid(prev => ({ ...prev, payment: true }))
          break
        }
      }
    }

    validateStep()
  }, [currentStep, bookingData, bookingType, isAvailable])

  const handleNext = () => {
    if (currentStep === "dates") {
      setCurrentStep("personal")
    } else if (currentStep === "personal") {
      setCurrentStep("payment")
    } else if (currentStep === "payment") {
      // Calculate total price before submitting using the same logic as price preview
      const totalPrice = calculateTotalWithRules({
        pricingRules: bookingData.pricingRules,
        guests: bookingData.bookingDetails.guests,
        bookingType,
        duration,
        checkInDate:
          bookingType === BOOKING_TYPE.villa
            ? bookingData.bookingDetails.checkIn || undefined
            : undefined,
      }).total

      // Create the new booking data object and update state atomically
      const newBookingData = {
        ...bookingData,
        bookingDetails: {
          ...bookingData.bookingDetails,
          type: bookingType,
          totalPrice,
        },
      }

      // Update state with functional updater
      setBookingData(prev => ({
        ...prev,
        bookingDetails: {
          ...prev.bookingDetails,
          type: bookingType,
          totalPrice,
        },
      }))

      // Pass the finalized booking data directly to onSubmit
      onSubmit(newBookingData)
    }
  }

  const handleBack = () => {
    if (currentStep === "personal") {
      setCurrentStep("dates")
    } else if (currentStep === "payment") {
      setCurrentStep("personal")
    }
  }

  const handleStepClick = (step: BookingStep) => {
    setCurrentStep(step)
  }

  const renderPricePreview = () => {
    const shouldShowPricePreview =
      (bookingType === BOOKING_TYPE.villa &&
        bookingData.bookingDetails.checkIn &&
        bookingData.bookingDetails.checkOut &&
        bookingData.bookingDetails.guests &&
        isAvailable === true) || // Only show when availability is confirmed
      (bookingType === BOOKING_TYPE.tour &&
        bookingData.bookingDetails.date &&
        bookingData.bookingDetails.guests)

    if (!shouldShowPricePreview) {
      return (
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {t("priceFrom", {
                defaultValue:
                  "Price starting from ${price} for {guests} {guestsLabel}",
                price: formatCurrency(
                  getLowestPrice(bookingData.pricingRules),
                  {
                    locale,
                    currency: bookingData.bookingDetails.currency || "USD",
                  },
                ),
                guests: 1,
                guestsLabel: t("person", { defaultValue: "person" }),
              })}
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted-foreground">
        <h3 className="font-medium mb-3">
          {t("priceSummary", { defaultValue: "Price Summary" })}
        </h3>
        {bookingType === BOOKING_TYPE.villa ? (
          <VillaPriceCalculation
            key={`${bookingType}-${bookingData.bookingDetails.checkIn?.getTime() || ""}-${bookingData.bookingDetails.checkOut?.getTime() || ""}-${bookingData.bookingDetails.guests}-${JSON.stringify(bookingData.pricingRules)}`}
            pricingRules={
              bookingData.pricingRules?.length > 0
                ? bookingData.pricingRules
                : []
            }
            guests={bookingData.bookingDetails.guests}
            locale={locale}
            t={t}
            duration={duration}
            currency={bookingData.bookingDetails.currency}
            checkInDate={bookingData.bookingDetails.checkIn || undefined}
          />
        ) : (
          <TourPriceCalculation
            key={`${bookingType}-${bookingData.bookingDetails.date?.getTime() || ""}-${bookingData.bookingDetails.guests}-${bookingData.bookingDetails.price}`}
            price={bookingData.bookingDetails.price}
            guests={bookingData.bookingDetails.guests}
            locale={locale}
            t={t}
            currency={bookingData.bookingDetails.currency}
          />
        )}
      </div>
    )
  }

  const renderDatesStep = () => (
    <div className="space-y-4">
      {bookingType === BOOKING_TYPE.villa ? (
        <>
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
                const checkInTime =
                  bookingData.bookingDetails.checkIn?.getTime() || 0
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
              checkIn: bookingData.bookingDetails.checkIn || undefined,
              checkOut: bookingData.bookingDetails.checkOut || undefined,
            }}
            labels={{
              checkinDate: t("checkinDate", { defaultValue: "Check-in date" }),
              checkoutDate: t("checkoutDate", {
                defaultValue: "Check-out date",
              }),
            }}
            error={dateError}
            onLoadingChange={setCalendarLoading}
            onBlockedDatesChange={setBlockedDates}
          />
          <AvailabilityPreview
            checkIn={bookingData.bookingDetails.checkIn}
            checkOut={bookingData.bookingDetails.checkOut}
            bookingType={bookingType}
            className="mt-2"
            calendarLoading={calendarLoading}
            blockedDates={blockedDates}
            onAvailabilityChange={setIsAvailable}
          />
        </>
      ) : (
        <DatePicker
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onOpen={() => setIsDatePickerOpen(true)}
          onSelectDate={date => {
            setBookingData({
              ...bookingData,
              bookingDetails: {
                ...bookingData.bookingDetails,
                date,
              },
            })
            setIsDatePickerOpen(false)
          }}
          label={getInternationalizedValue(
            dialog?.selectDate,
            locale,
            "Select date",
          )}
          selectedDate={bookingData.bookingDetails.date}
        />
      )}

      <div className="grid gap-2">
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
    </div>
  )

  const renderPersonalStep = () => (
    <div className="space-y-4">
      <div>
        <Input
          id="name"
          type="text"
          required
          labelText={t("nameLabel", { defaultValue: "Your name" })}
          errorMessage={t("nameError", {
            defaultValue: "Please enter your name",
          })}
          placeholder="Jane Doe"
          value={bookingData.customerDetails.name}
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
      <div>
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
          value={bookingData.customerDetails.email}
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
      <div>
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
          value={bookingData.customerDetails.phoneNumber}
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
    </div>
  )

  const renderPaymentStep = () => (
    <div className="space-y-4">
      {bookingType === BOOKING_TYPE.villa ? (
        <VillaPriceCalculation
          key={`${bookingType}-${bookingData.bookingDetails.checkIn?.getTime()}-${bookingData.bookingDetails.checkOut?.getTime()}-${bookingData.bookingDetails.guests}-${JSON.stringify(bookingData.pricingRules)}`}
          pricingRules={
            bookingData.pricingRules?.length > 0 ? bookingData.pricingRules : []
          }
          guests={bookingData.bookingDetails.guests}
          locale={locale}
          t={t}
          duration={duration}
          currency={bookingData.bookingDetails.currency}
          checkInDate={bookingData.bookingDetails.checkIn || undefined}
        />
      ) : (
        <TourPriceCalculation
          key={`${bookingType}-${bookingData.bookingDetails.date?.getTime() || ""}-${bookingData.bookingDetails.guests}-${bookingData.bookingDetails.basePrice}`}
          price={bookingData.bookingDetails.basePrice}
          guests={bookingData.bookingDetails.guests}
          locale={locale}
          t={t}
          currency={bookingData.bookingDetails.currency}
        />
      )}
      <div className="p-4 bg-guarumo-primary/20 rounded-lg border border-guarumo-primary">
        <p className="text-sm text-guarumo-primary">
          {t("paymentStepInfo", {
            defaultValue:
              "You'll be redirected to a secure payment page to complete your booking.",
          })}
        </p>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case "dates":
        return renderDatesStep()
      case "personal":
        return renderPersonalStep()
      case "payment":
        return renderPaymentStep()
      default:
        return null
    }
  }

  return (
    <>
      <form
        className={`grid gap-4 group ${className}`}
        noValidate
        onSubmit={e => {
          e.preventDefault()
          handleNext()
        }}
      >
        <BookingProgressIndicator
          currentStep={currentStep}
          steps={steps}
          onStepClick={handleStepClick}
          className="mb-6"
        />

        <div className="min-h-75">{renderStepContent()}</div>

        {/* Show price preview on all steps except payment */}
        {currentStep !== "payment" && renderPricePreview()}

        <DialogFooter className="flex-wrap">
          <div className="mt-5 flex justify-between w-full flex-none gap-2">
            <Button
              name="booking-back-button"
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === "dates"}
            >
              {t("back", { defaultValue: "Back" })}
            </Button>
            <div className="flex gap-2">
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
              <Button
                name="booking-next-button"
                type="submit"
                disabled={!isStepValid[currentStep]}
                className="group-invalid:pointer-events-none group-invalid:opacity-30"
              >
                {currentStep === "payment"
                  ? getInternationalizedValue(dialog?.ok, locale, "Reserve")
                  : t("next", { defaultValue: "Next" })}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </form>
    </>
  )
}
