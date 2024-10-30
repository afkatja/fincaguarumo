import Link from "next/link"
import React from "react"
import Icon from "./Icon"

import { navItems } from "./SocialNav"

const Footer = () => {
  const links = [
    {
      title: "Calle Altos Corozal, La Balsa, Puerto Jimenez, Osa, Costa Rica",
      href: "https://ul.waze.com/ul?ll=8.49527176%2C-83.33406687&navigate=no&zoom=17",
      icon: "Waze",
      className: "col-span-4",
    },
    ...navItems,
  ]
  const items = links.map(item => ({
    ...item,
    className: item.className ?? "",
  }))
  return (
    <div className="w-full bg-black text-white py-8">
      <footer className="w-11/12 mx-auto">
        <ul className="grid grid-cols-4 gap-4">
          {items.map(item => (
            <li key={crypto.randomUUID()} className={item.className}>
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
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}

export default Footer
