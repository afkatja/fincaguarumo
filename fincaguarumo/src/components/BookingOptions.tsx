"use client"
import { useState, useEffect } from "react"
// import { BookingService } from "../services/booking"
import { ExpediaService } from "../services/expedia"
import Datepicker from "./ui/datepicker"
import SelectBox from "./ui/selectBox"
import { Button } from "./ui/button"
import { loadTranslations } from "../lib/utils"

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
  const [checkin, setCheckin] = useState(new Date())
  const [checkout, setCheckout] = useState(new Date())
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

  const handleBookingClick = () => {
    const url = `https://www.booking.com/hotel/cr/villa-bruno-a-hidden-jungle-gem.html?aid=304142&label=gen173nr-1FCAsoM0IfdmlsbGEtYnJ1bm8tYS1oaWRkZW4tanVuZ2xlLWdlbUgzWARoM4gBAZgBMbgBGMgBDNgBAegBAfgBAogCAagCBLgCroLswgbAAgHSAiQyOTk2OTI3OC05MDY0LTQ2MjAtODQ2Yi02YWVlYTE1NzhhZmTYAgXgAgE&sid=ef97aaae69e87f0b80d352203416dd9f&all_sr_blocks=1391185401_413977351_2_0_0_1091564&checkin=${checkin.toISOString().split("T")[0]}&checkout=${checkout.toISOString().split("T")[0]}&dest_id=-1108708&dest_type=city&dist=0&group_adults=${guests}&group_children=0&hapos=1&highlighted_blocks=1391185401_413977351_2_0_0_1091564&hpos=1&matching_block_id=1391185401_413977351_2_0_0_1091564&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&sr_pri_blocks=1391185401_413977351_2_0_0_1091564_26271&srepoch=1750794564&srpvid=8d118b5e79280b04&type=total&ucfs=1&`
    window.open(url, "_blank")
  }

  const handleExpediaClick = () => {
    const url = expediaService.getExpediaUrl(
      expediaPropertyId,
      checkin.toISOString().split("T")[0],
      checkout.toISOString().split("T")[0]
    )
    window.open(url, "_blank")
  }

  const handleAirbnbClick = () => {
    const url = `https://www.airbnb.com/rooms/1392758794880269478?source_impression_id=p3_1750793716_P3dkCGHyoUr4jQr5&check_in=${checkin.toISOString().split("T")[0]}&guests=${guests}&adults=${guests}&check_out=${checkout.toISOString().split("T")[0]}&cancellation_policy_id=3`
    window.open(url, "_blank")
  }

  return (
    <div className="p-2">
      <div className="space-y-4">
        <div className="md:grid md:grid-cols-2 gap-4">
          <div>
            <Datepicker
              label={t.checkIn}
              placeholder={t.selectDate}
              selectedDate={checkin}
              onSelectDate={date => setCheckin(date)}
            />
          </div>
          <div>
            <Datepicker
              label={t.checkOut}
              placeholder={t.checkoutDate}
              selectedDate={checkout}
              onSelectDate={date => setCheckout(date)}
            />
          </div>
        </div>

        <div>
          <SelectBox
            label={t.guests}
            placeholder={t.numberOfGuests}
            onValueChange={value => setGuests(parseInt(value))}
            values={[
              { val: "1", text: `1 ${t.person}` },
              { val: "2", text: `2 ${t.people}` },
              { val: "3", text: `3 ${t.people}` },
              { val: "4", text: `4 ${t.people}` },
            ]}
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
