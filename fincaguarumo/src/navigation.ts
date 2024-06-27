import { createLocalizedPathnamesNavigation } from "next-intl/navigation"
import { locales } from "./config"

export const { Link, getPathname, redirect, usePathname, useRouter } =
  createLocalizedPathnamesNavigation({
    locales,
    pathnames: { "/": "/" },
    localePrefix: "always",
  })
