import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import NavItem from "./NavItem"

export const navItems = (t: (arg0: string) => string) => [
  { href: "/tours", title: t("tours") },
  { href: "/cabins", title: t("accommodations") },
  {
    href: "/camping",
    title: t("camping"),
  },
  { href: "volunteer", title: t("volunteer") },
  { href: "/salsa", title: t("salsa") },
  { href: "/blog", title: t("blog") },
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
        <NavItem key={crypto.randomUUID()} navItem={navItem} />
      ))}
    </nav>
  )
}

export default MainNav
