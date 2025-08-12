"use client"
import { useState, useEffect } from "react"
// import { BookingService } from "../services/booking"
import { ExpediaService } from "../services/expedia"
import Datepicker from "@/components/DatePicker"
import { Button } from "./ui/button"
import { loadTranslations } from "../lib/utils"
import SelectGuestsOptions from "../app/[locale]/(pages)/(payment)/SelectGuestsOptions"
import { format } from "date-fns"

interface BookingOptionsProps {
  propertyId: string
  expediaPropertyId: string
  locale?: string
}

export function BookingOptions({
  propertyId,
  expediaPropertyId,
  locale = "en",
}: BookingOptionsProps) {
  const [checkin, setCheckin] = useState(new Date(+new Date() + 86400000))
  const [checkout, setCheckout] = useState(new Date(+new Date() + 259200000))
  const [guests, setGuests] = useState(2)
  const [translations, setTranslations] = useState<{
    booking: {
      checkIn: string
      checkOut: string
      guests: string
      selectDate: string
      checkoutDate: string
      numberOfGuests: string
      person: string
      people: string
      bookOnBooking: string
      bookOnAirbnb: string
      bookOnExpedia: string
    }
  } | null>(null)

  const expediaService = new ExpediaService()

  useEffect(() => {
    const loadTranslationsData = async () => {
      const messages = await loadTranslations(locale)
      setTranslations(messages)
    }
    loadTranslationsData()
  }, [locale])

  // Fallback translations in case loading fails
  const fallbackTranslations = {
    booking: {
      checkIn: "Check in",
      checkOut: "Check out",
      guests: "Guests",
      selectDate: "Select date",
      checkoutDate: "Check-out date",
      numberOfGuests: "Number of guests",
      person: "person",
      people: "people",
      bookOnBooking: "Book on Booking.com",
      bookOnAirbnb: "Book on AirBnb",
      bookOnExpedia: "Book on Expedia",
    },
  }

  const t = translations?.booking || fallbackTranslations.booking

  const checkinStr = format(checkin, "yyyy-MM-dd")
  const checkoutStr = format(checkout, "yyyy-MM-dd")

  const handleBookingClick = () => {
    const url = `https://www.booking.com/hotel/cr/villa-bruno-a-hidden-jungle-gem.html?checkin=${checkinStr}&checkout=${checkoutStr}&group_adults=${guests}&group_children=0`
    window.open(url, "_blank", "noopener, noreferrer")
  }

  const handleExpediaClick = () => {
    const url = expediaService.getExpediaUrl(
      expediaPropertyId,
      checkinStr,
      checkoutStr,
      guests.toString()
    )
    window.open(url, "_blank", "noopener, noreferrer")
  }

  const handleAirbnbClick = () => {
    const url = `https://www.airbnb.com/rooms/1392758794880269478?check_in=${checkinStr}&guests=${guests}&adults=${guests}&check_out=${checkoutStr}`
    window.open(url, "_blank", "noopener, noreferrer")
  }

  return (
    <div className="p-2">
      <div className="space-y-4">
        <div className="md:grid md:grid-cols-2 gap-4">
          <div>
            <Datepicker
              label={t.checkIn}
              selectedDate={checkin.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              onSelectDate={date => setCheckin(date)}
            />
          </div>
          <div className="mt-4 sm:mt-0">
            <Datepicker
              label={t.checkOut}
              selectedDate={checkout.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              onSelectDate={date => setCheckout(date)}
            />
          </div>
        </div>

        <div>
          <SelectGuestsOptions
            onChange={value => {
              const n = Number.parseInt(value, 10)
              setGuests(Number.isFinite(n) && n > 0 ? n : 1)
            }}
            locale={locale}
            guests={guests.toString()}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <Button
            onClick={handleBookingClick}
            className="col-span-3 md:col-span-1"
          >
            {t.bookOnBooking}
          </Button>
          <Button
            onClick={handleAirbnbClick}
            className="col-span-3 md:col-span-1"
          >
            {t.bookOnAirbnb}
          </Button>
          <Button
            onClick={handleExpediaClick}
            className="col-span-3 md:col-span-1"
          >
            {t.bookOnExpedia}
          </Button>
        </div>
      </div>
    </div>
  )
}
