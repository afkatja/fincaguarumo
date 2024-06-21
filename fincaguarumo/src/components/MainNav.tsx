import Link from "next/link"
import translations from "./translations"
import { useId } from "react"

export const navItems = (locale: Record<string, Record<string, string>>) => [
  { href: "/tours", title: locale.header.tours },
  { href: "/cabins", title: locale.header.accommodations },
  {
    href: "/activities",
    title: locale.header.activities,
  },
  { href: "/salsa", title: locale.header.salsa },
  { href: "/about", title: locale.header.about },
  { href: "/contact", title: locale.header.contact },
]

const MainNav = ({ locale }: { locale: string }) => {
  const id = useId()

  return !locale || !translations[locale] ? (
    "loading"
  ) : (
    <nav className="hidden md:flex items-center gap-6">
      {navItems(translations[locale]).map((navItem, i) => (
        <Link
          key={id + i}
          href={navItem.href}
          className="text-sm font-medium hover:underline underline-offset-4"
          prefetch={false}
        >
          {navItem.title}
        </Link>
      ))}
    </nav>
  )
}

export default MainNav
