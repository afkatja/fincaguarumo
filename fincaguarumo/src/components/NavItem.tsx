"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

const NavItem = ({ navItem }: { navItem: { href: string; title: string } }) => {
  const pathname = usePathname()

  return (
    <>
      {pathname.includes(navItem.href) ? (
        <span className="lowercase text-sm font-bold text-guarumo-accent">
          {navItem.title}
        </span>
      ) : (
        <Link
          href={navItem.href}
          className="lowercase text-sm fancy-underline hover:text-guarumo-accent dark:hover:text-zinc-50 text-guarumo-primary dark:text-zinc-50 font-medium"
          prefetch={true}
        >
          {navItem.title}
        </Link>
      )}
    </>
  )
}

export default NavItem
