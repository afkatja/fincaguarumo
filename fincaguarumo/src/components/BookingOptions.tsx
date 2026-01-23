"use client"
import { useState } from "react"
// import { BookingService } from "../services/booking"
import { ExpediaService } from "../services/expedia"
import Datepicker from "@/components/DatePicker"
import { Button } from "./ui/button"
import { useTranslations } from "next-intl"
import SelectGuestsOptions from "../app/[locale]/(pages)/(payment)/SelectGuestsOptions"
import { format } from "date-fns"

interface BookingOptionsProps {
  expediaPropertyId: string
  locale?: string
}

export function BookingOptions({
  expediaPropertyId,
  locale = "en",
}: BookingOptionsProps) {
  const [checkin, setCheckin] = useState(new Date(+new Date() + 86400000))
  const [checkout, setCheckout] = useState(new Date(+new Date() + 259200000))
  const [guests, setGuests] = useState(2)

  const expediaService = new ExpediaService()

  const t = useTranslations("booking")

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
      guests.toString(),
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
              label={t("checkIn")}
              selectedDate={checkin}
              onSelectDate={date => setCheckin(date)}
            />
          </div>
          <div className="mt-4 sm:mt-0">
            <Datepicker
              label={t("checkOut")}
              selectedDate={checkout}
              onSelectDate={date => setCheckout(date)}
            />
          </div>
        </div>

        <div>
          <SelectGuestsOptions
            onChange={value => {
              const n = value
              setGuests(Number.isFinite(n) && n > 0 ? n : 1)
            }}
            locale={locale}
            guests={guests}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <Button
            name="book-on-others-button"
            onClick={handleBookingClick}
            className="col-span-3 md:col-span-1"
          >
            {t("bookOnBooking")}
          </Button>
          <Button
            name="book-on-airbnb-button"
            onClick={handleAirbnbClick}
            className="col-span-3 md:col-span-1"
          >
            {t("bookOnAirbnb")}
          </Button>
          <Button
            name="book-on-expedia-button"
            onClick={handleExpediaClick}
            className="col-span-3 md:col-span-1"
          >
            {t("bookOnExpedia")}
          </Button>
        </div>
      </div>
    </div>
  )
}
