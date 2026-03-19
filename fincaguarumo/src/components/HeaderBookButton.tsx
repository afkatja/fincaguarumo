"use client"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import BookingDialogTrigger from "./booking/BookingDialogTrigger"
import { BOOKING_TYPE } from "@/types"
import { Link } from "../navigation"

const HeaderBookButton = () => {
  const t = useTranslations("booking")
  const pathname = usePathname()

  if (
    pathname.includes("/villa-bruno") ||
    pathname.includes("/stay") ||
    pathname.includes("/accommodation")
  )
    return null

  if (pathname.includes("/tours"))
    return (
      <Link
        href="/villa-bruno"
        className="h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:translate-y-[-2px] hover:shadow-md cursor-pointer bg-secondary text-primary-foreground hover:bg-secondary/80"
      >
        {t("reserveButton", { defaultValue: "Book Villa Bruno now" })}
      </Link>
    )

  return (
    <BookingDialogTrigger
      bookingType={BOOKING_TYPE.villa}
      buttonText={t("reserveButton", { defaultValue: "Book Villa Bruno now" })}
      className=""
    />
  )
}

export default HeaderBookButton
