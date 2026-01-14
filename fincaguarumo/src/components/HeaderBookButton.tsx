"use client"
import { useDialog } from "../app/providers/DialogProvider"
import { Button } from "./ui/button"
import { usePathname, useRouter } from "next/navigation"

const HeaderBookButton = () => {
  const router = useRouter()
  const { t } = useDialog()
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
      {t?.reserveButton || "Book Villa Bruno now"}
    </Button>
  )
}

export default HeaderBookButton
