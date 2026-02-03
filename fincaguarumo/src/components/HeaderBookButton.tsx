"use client"
import { useTranslations } from "next-intl"
import { Button } from "./ui/button"
import { usePathname } from "next/navigation"
import { useDialog } from "@/app/providers/DialogProvider"
import { useBooking } from "@/app/providers/BookingProvider"
import { BOOKING_TYPE } from "@/types"

const HeaderBookButton = () => {
  const t = useTranslations("booking")
  const pathname = usePathname()
  const { openBookingDialog } = useDialog()
  const { setBookingData } = useBooking()

  if (
    pathname.includes("/villa-bruno") ||
    pathname.includes("/stay") ||
    pathname.includes("/accommodation")
  )
    return null

  const handleBookNow = () => {
    // Set default booking data for villa booking
    setBookingData(prev => ({
      ...prev,
      bookingDetails: {
        ...prev.bookingDetails,
        type: BOOKING_TYPE.villa,
        title: "Villa Bruno",
        description: "Book your stay at Villa Bruno",
        price: 150, // Default price per night
      },
    }))
    // Open the booking dialog
    openBookingDialog()
  }

  return (
    <Button
      name="booking-button"
      size="lg"
      className=""
      variant="secondary"
      onClick={handleBookNow}
    >
      {t("reserveButton", { defaultValue: "Book Villa Bruno now" })}
    </Button>
  )
}

export default HeaderBookButton
