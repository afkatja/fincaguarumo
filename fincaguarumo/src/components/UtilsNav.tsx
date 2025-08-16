import React from "react"
import NavItem from "./NavItem"

const UtilsNav = ({
  navItems,
  className,
}: {
  navItems: { href: string; title: string }[]
  className?: string
}) => {
  if (!navItems || !navItems.length) return
  return (
    <nav className={`hidden md:flex items-center gap-5 mx-4 ${className}`}>
      {navItems.map(navItem => (
        <NavItem key={navItem.title} navItem={navItem} />
      ))}
    </nav>
  )
}

export default UtilsNav
