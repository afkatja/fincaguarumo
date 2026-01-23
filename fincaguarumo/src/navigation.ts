import { createNavigation } from "next-intl/navigation"
import { locales } from "./config"

export const { Link, getPathname, redirect, usePathname, useRouter } =
  createNavigation({
    locales,
  })
