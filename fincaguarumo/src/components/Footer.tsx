"use client"
import { Link, usePathname } from "@/navigation"
import React from "react"
import Icon from "./Icon"
import { getLocalizedPath } from "@/lib/url"

import { navItems } from "./SocialNav"

type FooterLink = {
  title: string
  href: string
  icon: string
  className?: string
  external?: boolean
}

const Footer = () => {
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || "en"

  const links: FooterLink[] = [
    {
      title: "Calle Altos Corozal, La Balsa, Puerto Jimenez, Osa, Costa Rica",
      href: "https://ul.waze.com/ul?ll=8.49527176%2C-83.33406687&navigate=no&zoom=17",
      icon: "Waze",
      className: "col-span-4",
      external: true,
    },
    {
      title: "Sustainability commitment",
      href: getLocalizedPath("/about#sustainability", locale),
      icon: "Guarumo",
      className: "col-span-4",
    },
    ...navItems.map(item => ({ ...item, external: true } as FooterLink)),
  ]

  return (
    <div className="w-full bg-zinc-950 text-zinc-50 py-8">
      <footer className="w-11/12 mx-auto">
        <ul className="grid grid-cols-4 gap-4">
          {links.map(item => (
            <li key={item.title} className={item.className ?? ""}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link hover:text-secondary"
                >
                  <Icon
                    icon={item.icon}
                    className="mr-2 inline-block"
                    size={20}
                    color="#ffffff"
                  />
                  {item.title}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="footer-link hover:text-secondary"
                >
                  <Icon
                    icon={item.icon}
                    className="mr-2 inline-block"
                    size={20}
                    color="#ffffff"
                  />
                  {item.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}

export default Footer