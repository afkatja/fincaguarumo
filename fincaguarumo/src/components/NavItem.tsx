"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

const NavItem = ({ navItem }: { navItem: { href: string; title: string } }) => {
  const pathname = usePathname()
  console.log({ pathname })

  return (
    <Link
      key={crypto.randomUUID()}
      href={navItem.href}
      className={`text-sm hover:underline underline-offset-4 ${
        pathname.includes(navItem.href)
          ? "font-bold underline decoration-primary decoration-2"
          : "font-medium"
      }`}
      prefetch={false}
    >
      {navItem.title}
    </Link>
  )
}

export default NavItem
