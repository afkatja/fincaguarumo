import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"

import { navItems } from "./MainNav"
import Link from "next/link"
import { randomUUID } from "crypto"
import Icon from "./Icon"

const MobileNav = async ({ locale }: { locale: string }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Icon icon="Menu" className="w-6 h-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="grid gap-6 p-6">
          {navItems.map(navItem => (
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
