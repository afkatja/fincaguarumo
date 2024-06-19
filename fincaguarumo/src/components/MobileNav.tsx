import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import MenuIcon from "./icons/MenuIcon"

import { navItems } from "./MainNav"
import Link from "next/link"
import { useId } from "react"
import translations from "./translations"

const MobileNav = ({ locale }: { locale: string }) => {
  const id = useId()
  return !locale || !translations[locale] ? (
    "loading"
  ) : (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <MenuIcon className="w-6 h-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="grid gap-6 p-6">
          {navItems(translations[locale]).map((navItem, i) => (
            <Link
              key={id + i}
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
