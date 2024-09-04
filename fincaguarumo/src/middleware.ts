import createMiddleware from "next-intl/middleware"
import { locales } from "./config"

export default createMiddleware({
  locales,
  defaultLocale: "en",
  // localePrefix: "never",
})

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/",
    // "/(nl|en|es|ru)/:path*",
    // "/((?!_next).*)",
    "/((?!api|_next/static|_next/image|images|studio).*)",
  ],
}
