"use client"
import { useState } from "react"
// import { BookingService } from "../services/booking"
import { ExpediaService } from "../services/expedia"
import Datepicker from "./ui/datepicker"
import SelectBox from "./ui/selectBox"
import { Button } from "./ui/button"

interface BookingOptionsProps {
  propertyId: string
  expediaPropertyId: string
}

export function BookingOptions({
  propertyId,
  expediaPropertyId,
}: BookingOptionsProps) {
  const [checkin, setCheckin] = useState(new Date())
  const [checkout, setCheckout] = useState(new Date())
  const [guests, setGuests] = useState(2)

  // const bookingService = new BookingService()
  const expediaService = new ExpediaService()

  // const handleBookingClick = () => {
  //   const url = bookingService.getBookingUrl(propertyId, checkin, checkout)
  //   window.open(url, "_blank")
  // }

  const handleExpediaClick = () => {
    const url = expediaService.getExpediaUrl(
      expediaPropertyId,
      checkin.toISOString().split("T")[0],
      checkout.toISOString().split("T")[0]
    )
    window.open(url, "_blank")
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Datepicker
              label="Check in"
              placeholder="Select date"
              selectedDate={checkin}
              onSelectDate={date => setCheckin(date)}
            />
          </div>
          <div>
            <Datepicker
              label="Check out"
              placeholder="Check-out date"
              selectedDate={checkout}
              onSelectDate={date => setCheckout(date)}
            />
          </div>
        </div>

        <div>
          <SelectBox
            label="Guests"
            placeholder="Number of guests"
            onValueChange={value => setGuests(parseInt(value))}
            values={[
              { val: "1", text: "1 person" },
              { val: "2", text: "2 people" },
              { val: "3", text: "3 people" },
              { val: "4", text: "4 people" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {/* <button
            onClick={handleBookingClick}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Book on Booking.com
          </button> */}
          <Button onClick={handleExpediaClick}>Book on Expedia</Button>
        </div>
      </div>
    </div>
  )
}
