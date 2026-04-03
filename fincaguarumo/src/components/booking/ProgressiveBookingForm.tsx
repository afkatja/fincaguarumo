"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import { calculateDuration } from "@/lib/dateUtils"
import calculateTotal, { calculateTotalWithRules } from "@/lib/calculateTotal"
import { getDefaultBasePrice, getLowestPrice } from "@/lib/pricingEngine"
import { BookingType, BOOKING_TYPE, BookingData } from "@/types"
import { useVillaBooking } from "@/app/providers/VillaBookingProvider"
import { useDialog } from "@/app/providers/DialogProvider"
import BookingProgressIndicator, {
  BookingStep,
} from "./BookingProgressIndicator"
import AvailabilityPreview from "./AvailabilityPreview"
import { useBookingCore } from "@/app/providers/BookingCoreProvider"
import Loading from "../../app/[locale]/loading"
import { formatCurrency } from "../../lib/currency"

interface ProgressiveBookingFormProps {
  onSubmit: (bookingData: BookingData) => void
  onCancel: () => void
  locale: string
  className?: string
}

export default function ProgressiveBookingForm({
  onSubmit,
  onCancel,
  locale,
  className = "",
}: ProgressiveBookingFormProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("dates")
  const [dateError, setDateError] = useState("")
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
  const [personalSubmitAttempted, setPersonalSubmitAttempted] = useState(false)

  const {
    state,
    setDates,
    setGuests,
    setCustomerDetails,
    setPricing,
    persistToStorage,
  } = useBookingCore()
  const { pricingRules } = useVillaBooking()
  const { dialogData: dialog } = useDialog()
  const t = useTranslations("booking")

  const handlePhoneChange = useCallback(
    (phoneNumber: string) => {
      setCustomerDetails({ phoneNumber })
    },
    [setCustomerDetails],
  )

  const bookingType: BookingType | null = state.data.bookingType

  const pricingRulesRef = useRef<any[]>([])

  // Clear pricing rules when booking type changes
  useEffect(() => {
    pricingRulesRef.current = []
  }, [bookingType])

  // Helper to compute duration for villa
  const villaDuration = useMemo(
    () =>
      calculateDuration(
        state.data.dates.checkIn || null,
        state.data.dates.checkOut || null,
      ),
    [state.data.dates.checkIn, state.data.dates.checkOut],
  )

  // Update pricing rules when they become available
  useEffect(() => {
    if (bookingType === BOOKING_TYPE.villa && pricingRules) {
      pricingRulesRef.current = pricingRules
      setPricing({ pricingRules })
    }
  }, [bookingType, pricingRules, setPricing])

  // Validate current step against core state
  useEffect(() => {
    if (!bookingType) return

    setIsStepValid(prev => {
      const datesValid =
        bookingType === BOOKING_TYPE.villa
          ? !!(
              state.data.dates.checkIn &&
              state.data.dates.checkOut &&
              state.data.dates.checkOut.getTime() >
                state.data.dates.checkIn.getTime() &&
              isAvailable === true
            )
          : !!state.data.dates.date

      const personalValid =
        !!state.data.customerDetails.name &&
        !!state.data.customerDetails.email &&
        !!state.data.customerDetails.phoneNumber &&
        state.data.customerDetails.phoneNumber.trim().length >= 7 // Basic validation

      return {
        ...prev,
        dates: datesValid,
        personal: personalValid,
        payment: true, // if payment step is just info + redirect
      }
    })
  }, [bookingType, state.data, isAvailable])

  if (!bookingType) {
    return <Loading />
  }

  const steps: { id: BookingStep; label: string }[] = [
    {
      id: "dates",
      label: t("stepDates", { defaultValue: "Dates" }),
    },
    {
      id: "personal",
      label: t("stepPersonal", { defaultValue: "Personal" }),
    },
    {
      id: "payment",
      label: t("stepPayment", { defaultValue: "Payment" }),
    },
  ]

  const handleNext = async () => {
    if (currentStep === "dates") {
      if (!isStepValid.dates) return
      setCurrentStep("personal")
      return
    }

    if (currentStep === "personal") {
      const phone = state.data.customerDetails.phoneNumber?.trim() ?? ""
      const personalOk =
        !!state.data.customerDetails.name?.trim() &&
        !!state.data.customerDetails.email?.trim() &&
        phone.length >= 7
      if (!personalOk) {
        setPersonalSubmitAttempted(true)
        return
      }
      setCurrentStep("payment")
      return
    }

    if (currentStep === "payment") {
      // Finalize bookingData for submit
      let totalPrice = state.data.totalPrice
      let basePrice = state.data.baseUnitPrice
      let pricingRulesForCalculation: any[] = []

      if (bookingType === BOOKING_TYPE.villa) {
        // Use pricing rules from state (now available in state.data.pricingRules)
        pricingRulesForCalculation = state.data.pricingRules

        const totalResult = calculateTotalWithRules({
          pricingRules: pricingRulesForCalculation,
          guests: state.data.guests,
          bookingType,
          duration: villaDuration,
          checkInDate: state.data.dates.checkIn || undefined,
        })
        totalPrice = totalResult.total
        basePrice = getDefaultBasePrice(pricingRulesForCalculation) ?? 0
        setPricing({ baseUnitPrice: basePrice })
      } else {
        // Tour: core already has baseUnitPrice; recompute total if needed
        const totalResult = calculateTotal({
          price: state.data.baseUnitPrice,
          guests: state.data.guests,
          bookingType,
          duration: 1,
        })
        totalPrice = totalResult.total
      }

      // Build legacy BookingData payload expected by your backend/email
      const bookingData: BookingData = {
        source: state.data.source,
        customerDetails: state.data.customerDetails,
        bookingDetails: {
          type: bookingType,
          title: state.data.bookingDetails.title,
          description: state.data.bookingDetails.description,
          duration: bookingType === BOOKING_TYPE.villa ? villaDuration : 1,
          location: state.data.bookingDetails.location,
          body: "",
          date: state.data.dates.date || state.data.dates.checkIn || new Date(),
          checkIn: state.data.dates.checkIn,
          checkOut: state.data.dates.checkOut,
          guests: state.data.guests,
          price: state.data.baseUnitPrice,
          basePrice,
          totalPrice,
          currency: state.data.currency,
          geo: { lat: 0, lng: 0 }, // enhance from villa/tour if needed
        },
        pricingRules: pricingRulesForCalculation,
      }

      // Save to localStorage only on final submission
      persistToStorage()

      onSubmit(bookingData)
    }
  }

  const handleBack = () => {
    if (currentStep === "personal") {
      setPersonalSubmitAttempted(false)
      setCurrentStep("dates")
    } else if (currentStep === "payment") {
      setPersonalSubmitAttempted(false)
      setCurrentStep("personal")
    }
  }

  const handleStepClick = (step: BookingStep) => {
    setCurrentStep(step)
  }

  // Price preview using core + optional villa rules
  const renderPricePreview = () => {
    if (!bookingType) return null

    if (bookingType === BOOKING_TYPE.villa) {
      // Use cached pricing rules instead of fetching from state
      const currentPricingRules = pricingRulesRef.current

      // Only show once dates & guests & availability are okay
      const shouldShow =
        !!state.data.dates.checkIn &&
        !!state.data.dates.checkOut &&
        !!state.data.guests &&
        isAvailable === true

      if (!shouldShow) {
        return (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t("priceFrom", {
                  defaultValue:
                    "Price starting from ${price} for {guests} {guestsLabel}",
                  price: formatCurrency(getLowestPrice(currentPricingRules), {
                    locale,
                    currency: state.data.currency || "USD",
                  }),
                  guests: 1,
                  guestsLabel: t("person", { defaultValue: "person" }),
                })}
              </span>
            </div>
          </div>
        )
      }

      return (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">
            {t("priceSummary", { defaultValue: "Price Summary" })}
          </h3>
          <VillaPriceCalculation
            // Pass pricing rules from state to avoid timing issues
            guests={state.data.guests}
            locale={locale}
            duration={villaDuration}
            currency={state.data.currency}
            checkInDate={state.data.dates.checkIn || undefined}
            pricingRules={state.data.pricingRules}
          />
        </div>
      )
    }

    // Tour price preview
    if (!state.data.baseUnitPrice || !state.data.guests) return null

    return (
      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted-foreground">
        <h3 className="font-medium mb-3">
          {t("priceSummary", { defaultValue: "Price Summary" })}
        </h3>
        <TourPriceCalculation
          price={state.data.baseUnitPrice}
          guests={state.data.guests}
          locale={locale}
          t={t}
          currency={state.data.currency}
        />
      </div>
    )
  }

  const renderDatesStep = () => {
    if (bookingType === BOOKING_TYPE.villa) {
      return (
        <div className="space-y-4">
          <BookingCalendar
            onBlockedDatesChange={setBlockedDates}
            onLoadingChange={setCalendarLoading}
            selectedDates={{
              checkIn: state.data.dates.checkIn || undefined,
              checkOut: state.data.dates.checkOut || undefined,
            }}
            onSelectDate={(date, type) => {
              setDateError("")
              if (type === "check-in") {
                const checkInDate = new Date(date)
                const checkOutDate = new Date(date)
                checkOutDate.setDate(checkOutDate.getDate() + 1)
                setDates({
                  date,
                  checkIn: checkInDate,
                  checkOut: checkOutDate,
                })
              } else {
                const newCheckOut = new Date(date)
                const checkInDate = state.data.dates.checkIn

                if (!checkInDate) {
                  setDateError(
                    t("selectCheckInFirst", {
                      defaultValue: "Please select check-in date first",
                    }),
                  )
                  return
                }

                const checkInTime = checkInDate.getTime()
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

                setDates({
                  checkOut: newCheckOut,
                })
              }
            }}
            labels={{
              checkinDate: t("checkinDate", { defaultValue: "Check-in date" }),
              checkoutDate: t("checkoutDate", {
                defaultValue: "Check-out date",
              }),
            }}
            error={dateError}
          />

          <AvailabilityPreview
            bookingType={bookingType}
            checkIn={state.data.dates.checkIn}
            checkOut={state.data.dates.checkOut}
            blockedDates={blockedDates}
            onAvailabilityChange={setIsAvailable}
            calendarLoading={calendarLoading}
            className="mt-2"
          />

          <div className="grid gap-2">
            <SelectGuestsOptions
              guests={state.data.guests}
              onChange={val => setGuests(val)}
              locale={locale}
            />
          </div>
        </div>
      )
    }

    // Tour: single date picker
    return (
      <div className="space-y-4">
        <div data-testid="date-picker">
          <DatePicker
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onOpen={() => setIsDatePickerOpen(true)}
            onSelectDate={date => {
              setDates({
                date,
              })
              setIsDatePickerOpen(false)
            }}
            label={getInternationalizedValue(
              dialog?.selectDate,
              locale,
              "Select date",
            )}
            selectedDate={state.data.dates.date || undefined}
            triggerTestId="select-date"
          />
        </div>

        <div className="grid gap-2">
          <SelectGuestsOptions
            guests={state.data.guests}
            onChange={val => setGuests(val)}
            locale={locale}
          />
        </div>
      </div>
    )
  }

  const renderPersonalStep = () => {
    const phone = state.data.customerDetails.phoneNumber?.trim() ?? ""
    const phoneFieldInvalid = !phone || phone.length < 7
    return (
      <div className="flex flex-col space-y-4">
        <Input
          id="name"
          type="text"
          required
          data-testid="name"
          labelText={t("nameLabel", { defaultValue: "Your name" })}
          errorMessage={t("nameError", {
            defaultValue: "Please enter your name",
          })}
          placeholder="Jane Doe"
          onChangeHandler={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomerDetails({ name: e.target.value })
          }
          value={state.data.customerDetails.name}
          forceShowError={
            personalSubmitAttempted && !state.data.customerDetails.name?.trim()
          }
        />
        <Input
          id="email"
          type="email"
          required
          data-testid="email"
          errorMessage={t("emailError", {
            defaultValue: "Please enter a valid email address",
          })}
          labelText={t("emailLabel", { defaultValue: "Your email *" })}
          placeholder="jane@doe.com"
          pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
          value={state.data.customerDetails.email}
          onChangeHandler={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomerDetails({ email: e.target.value })
          }
          forceShowError={
            personalSubmitAttempted && !state.data.customerDetails.email?.trim()
          }
        />
        <PhoneInput
          id="phone"
          required
          defaultCountry="CR"
          errorMessage={t("phoneError", {
            defaultValue: "Please enter a valid phone number",
          })}
          labelText={t("phoneLabel", { defaultValue: "Your phone number *" })}
          placeholder="12345678"
          pattern="^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$"
          value={state.data.customerDetails.phoneNumber}
          onChange={handlePhoneChange}
          forceShowError={personalSubmitAttempted && phoneFieldInvalid}
        />
      </div>
    )
  }

  const renderPaymentStep = () => (
    <div className="space-y-4">
      {bookingType === BOOKING_TYPE.villa ? (
        <VillaPriceCalculation
          guests={state.data.guests}
          locale={locale}
          duration={villaDuration}
          currency={state.data.currency}
          checkInDate={state.data.dates.checkIn || undefined}
          pricingRules={state.data.pricingRules}
        />
      ) : (
        <TourPriceCalculation
          price={state.data.baseUnitPrice}
          guests={state.data.guests}
          locale={locale}
          t={t}
          currency={state.data.currency}
        />
      )}

      <p className="text-sm text-muted-foreground">
        {t("paymentStepInfo", {
          defaultValue:
            "You'll be redirected to a secure payment page to complete your booking.",
        })}
      </p>
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
    <form
      noValidate
      className={`grid gap-4 group ${className}`}
      data-testid="booking-form"
      data-active-step={currentStep}
      onSubmit={e => {
        e.preventDefault()
        void handleNext()
      }}
    >
      <BookingProgressIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        // isStepValid={isStepValid}
      />

      <div className="min-h-45 mt-6">{renderStepContent()}</div>

      {currentStep !== "payment" && renderPricePreview()}

      <DialogFooter className="mt-auto flex justify-between flex-wrap">
        <div className="pt-5 flex justify-between w-full flex-none gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="booking-cancel"
          >
            {getInternationalizedValue(dialog?.cancel, locale, "Cancel")}
          </Button>

          <div className="space-x-2">
            {currentStep !== "dates" && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                data-testid="booking-back"
              >
                {t("back", { defaultValue: "Back" })}
              </Button>
            )}

            <Button
              type="submit"
              disabled={
                currentStep === "personal" ? false : !isStepValid[currentStep]
              }
              data-testid="submit"
            >
              {currentStep === "payment"
                ? getInternationalizedValue(dialog?.ok, locale, "Reserve")
                : t("next", { defaultValue: "Next" })}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </form>
  )
}
