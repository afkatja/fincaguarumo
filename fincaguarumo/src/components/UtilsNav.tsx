// import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import React from "react"
import NavItem from "./NavItem"

export const navItems = [
  { href: "/about", title: "about" },
  { href: "/contact", title: "contact" },
]

const UtilsNav = async ({
  locale,
  className,
}: {
  locale: string
  className?: string
}) => {
  // unstable_setRequestLocale(locale)

  // const t = await getTranslations("header")
  return (
    <nav className={`hidden md:flex items-center gap-5 ${className}`}>
      {navItems.map(navItem => (
        <NavItem key={crypto.randomUUID()} navItem={navItem} />
      ))}
    </nav>
  )
}

export default UtilsNav
