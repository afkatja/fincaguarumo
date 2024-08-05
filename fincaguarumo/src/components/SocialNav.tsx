import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import Link from "next/link"
import React from "react"
import Icon, { IconColor } from "./Icon"

const navItems = (t: (arg0: string) => string) => [
  {
    title: t("facebook"),
    href: "https://www.facebook.com/fincaguarumoosa",
    icon: "Facebook",
  },
  {
    title: t("instagram"),
    href: "",
    icon: "Instagram",
  },
  {
    title: t("youtube"),
    href: "",
    icon: "Youtube",
  },
]

const SocialNav = async ({
  className,
  locale,
}: {
  locale: string
  className?: string
}) => {
  unstable_setRequestLocale(locale)

  const t = await getTranslations("header")
  return (
    <nav className={`hidden md:flex items-center gap-5 mx-4 ${className}`}>
      {navItems(t).map(navItem => (
        <Link key={crypto.randomUUID()} href={navItem.href} prefetch={false}>
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
