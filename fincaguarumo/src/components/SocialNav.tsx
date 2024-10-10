import Link from "next/link"
import React from "react"
import Icon, { IconColor } from "./Icon"

const navItems = [
  {
    title: "facebook",
    href: "https://www.facebook.com/fincaguarumoosa",
    icon: "Facebook",
  },
  {
    title: "instagram",
    href: "https://www.instagram.com/fincaguarumo.osa",
    icon: "Instagram",
  },
  {
    title: "youtube",
    href: "https://www.youtube.com/@FincaGuarumo",
    icon: "Youtube",
  },
  { title: "whatsapp", href: "https://wa.me/50687495341", icon: "Whatsapp" },
]

const SocialNav = ({ className }: { className?: string }) => {
  return (
    <nav className={`hidden md:flex items-center gap-5 mx-4 ${className}`}>
      {navItems.map(navItem => (
        <Link
          key={crypto.randomUUID()}
          href={navItem.href}
          prefetch={false}
          target="_blank"
        >
          <Icon
            className="hover:fill-secondary"
            icon={navItem.icon}
            alt={navItem.title}
            size={20}
            color={IconColor.Primary}
          />
        </Link>
      ))}
    </nav>
  )
}

export default SocialNav
