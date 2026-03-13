"use client"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import BookingDialogTrigger from "./booking/BookingDialogTrigger"
import { BOOKING_TYPE } from "@/types"

const HeaderBookButton = () => {
  const t = useTranslations("booking")
  const pathname = usePathname()

  if (
    pathname.includes("/villa-bruno") ||
    pathname.includes("/stay") ||
    pathname.includes("/accommodation")
  )
    return null

  return (
    <BookingDialogTrigger
      bookingType={BOOKING_TYPE.villa}
      title="Villa Bruno"
      description="Book your stay at Villa Bruno"
      buttonText={t("reserveButton", { defaultValue: "Book Villa Bruno now" })}
      className=""
    />
  )
}

export default HeaderBookButton
