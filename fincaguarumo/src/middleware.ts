import createMiddleware from "next-intl/middleware"
import { locales } from "./config"

export default createMiddleware({
  locales,
  defaultLocale: "en",
  // localePrefix: "always",
})

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|images|studio|favicon|assets|robots|_redirects).*)",
  ],
}
