import createMiddleware from "next-intl/middleware"
import { locales } from "./config"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
})

export default function proxy(request: NextRequest) {
  // Handle internationalization
  const response = intlMiddleware(request)

  const locale = request.nextUrl.pathname.split("/")[1]
  const detectedLocale = locales.includes(locale) ? locale : "en"
  response.headers.set("Content-Language", detectedLocale)

  return response
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|images|studio|favicon|assets|robots|_redirects|llms|sitemap.xml).*)",
  ],
}
