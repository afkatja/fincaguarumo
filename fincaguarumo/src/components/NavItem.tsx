"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

const NavItem = ({ navItem }: { navItem: { href: string; title: string } }) => {
  const pathname = usePathname()

  return (
    <Link
      href={`/${navItem.href}`}
      className={`lowercase text-sm fancy-underline hover:text-guarumo-accent ${
        pathname.includes(navItem.href)
          ? "font-bold text-guarumo-accent active"
          : "text-guarumo-primary font-medium"
      }`}
      prefetch={true}
    >
      {navItem.title}
    </Link>
  )
}

export default NavItem
