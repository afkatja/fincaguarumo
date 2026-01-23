"use client"
import { useTranslations } from "next-intl"
import { Button } from "./ui/button"
import { usePathname, useRouter } from "next/navigation"

const HeaderBookButton = () => {
  const router = useRouter()
  const t = useTranslations("booking")
  const pathname = usePathname()
  if (
    pathname.includes("/villa-bruno") ||
    pathname.includes("/stay") ||
    pathname.includes("/accommodation")
  )
    return null

  return (
    <Button
      name="booking-button"
      size="lg"
      className=""
      variant="secondary"
      onClick={() => router.push("/villa-bruno")}
    >
      {t("reserveButton", { defaultValue: "Book Villa Bruno now" })}
    </Button>
  )
}

export default HeaderBookButton
