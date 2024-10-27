import Link from "next/link"
import React from "react"
import Icon from "./Icon"

import { navItems } from "./SocialNav"

const Footer = () => {
  const items = [
    {
      title: "Calle Altos Corozal, La Balsa, Puerto Jimenez, Osa, Costa Rica",
      href: "https://ul.waze.com/ul?ll=8.49527176%2C-83.33406687&navigate=no&zoom=17",
      icon: "Waze",
    },
    ...navItems,
  ]
  return (
    <div className="w-full bg-black text-white py-8">
      <footer className="w-11/12 mx-auto">
        <ul className="flex flex-wrap gap-4">
          {items.map(item => (
            <li key={crypto.randomUUID()}>
              <Link href={item.href} className="footer-link hover:text-secondary">
                <Icon
                  icon={item.icon}
                  className="mr-2 inline-block"
                  size={30}
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
