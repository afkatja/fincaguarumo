import createMiddleware from "next-intl/middleware"
import { locales } from "./config"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
})

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Handle redirects first
  const redirects: Record<string, string> = {
    "/villa-bruno": "/stay",
    "/accommodation": "/stay",
    // Add locale-prefixed versions
    "/es/villa-bruno": "/es/stay",
    "/es/accommodation": "/es/stay",
    "/nl/villa-bruno": "/nl/stay",
    "/nl/accommodation": "/nl/stay",
    "/de/villa-bruno": "/de/stay",
    "/de/accommodation": "/de/stay",
    "/ru/villa-bruno": "/ru/stay",
    "/ru/accommodation": "/ru/stay",
  }

  if (redirects[path]) {
    return NextResponse.redirect(new URL(redirects[path], request.url), 301)
  }

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
