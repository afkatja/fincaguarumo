import Link from "next/link"
import React from "react"
import Icon, { IconColor } from "./Icon"

export const navItems: {
  title: string
  href: string
  icon: string
  [prop: string]: any
}[] = [
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
          key={navItem.title}
          href={navItem.href}
          prefetch={false}
          target="_blank"
        >
          <Icon
            className="hover:fill-secondary fill-guarumo-primary dark:fill-zinc-50"
            icon={navItem.icon}
            alt={navItem.title}
            size={20}
            // color={IconColor.Primary}
          />
        </Link>
      ))}
    </nav>
  )
}

export default SocialNav
