import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import MenuIcon from "./icons/MenuIcon"

import { navItems } from "./MainNav"
import Link from "next/link"
import { randomUUID } from "crypto"
import { getTranslations, unstable_setRequestLocale } from "next-intl/server"

const MobileNav = async ({ locale }: { locale: string }) => {
  unstable_setRequestLocale(locale)

  const t = await getTranslations("header")
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <MenuIcon className="w-6 h-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="grid gap-6 p-6">
          {navItems(t).map(navItem => (
            <Link
              key={randomUUID()}
              href={navItem.href}
              className="flex items-center gap-2 text-lg font-semibold"
              prefetch={false}
            >
              {navItem.title}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav
