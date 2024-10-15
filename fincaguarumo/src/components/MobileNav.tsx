import Link from "next/link"
import { randomUUID } from "crypto"
import Sheet from "./Sheet"

const MobileNav = ({
  navItems,
}: {
  navItems: { title: string; href: string }[]
}) => {
  if (!navItems || !navItems.length) return
  return (
    <Sheet>
      {navItems.map(navItem => (
        <Link
          key={randomUUID()}
          href={navItem.href}
          className="flex items-center gap-2 text-lg font-semibold"
          prefetch
        >
          {navItem.title}
        </Link>
      ))}
    </Sheet>
  )
}

export default MobileNav
