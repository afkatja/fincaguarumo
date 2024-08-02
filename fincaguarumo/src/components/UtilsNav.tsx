import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import React from "react"
import NavItem from "./NavItem"

export const navItems = (t: (arg0: string) => string) => [
  { href: "/about", title: t("about") },
  { href: "/contact", title: t("contact") },
]

const UtilsNav = async ({
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

export default UtilsNav
