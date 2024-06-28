import Link from "next/link"
import { getTranslations, unstable_setRequestLocale } from "next-intl/server"

export const navItems = (t: (arg0: string) => string) => [
  { href: "/tours", title: t("tours") },
  { href: "/cabins", title: t("accommodations") },
  {
    href: "/activities",
    title: t("activities"),
  },
  { href: "/salsa", title: t("salsa") },
  { href: "/about", title: t("about") },
  { href: "/contact", title: t("contact") },
]

const MainNav = async ({
  locale,
  className,
}: {
  locale: string
  className?: string
}) => {
  unstable_setRequestLocale(locale)

  const t = await getTranslations("header")
  return (
    <nav className={`hidden md:flex items-center gap-5 ${className}`}>
      {navItems(t).map(navItem => (
        <Link
          key={crypto.randomUUID()}
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
