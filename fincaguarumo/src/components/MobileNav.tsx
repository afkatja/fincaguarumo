import { randomUUID } from "crypto"
import Sheet from "./Sheet"
import { createNavigation } from "next-intl/navigation"
const MobileNav = ({
  navItems,
}: {
  navItems: { title: string; href: string }[]
}) => {
  if (!navItems || !navItems.length) return
  const { Link } = createNavigation()
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
