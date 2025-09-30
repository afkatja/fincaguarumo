import createMiddleware from "next-intl/middleware"
import { locales } from "./config"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "never",
})

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Handle redirects first
  const redirects: Record<string, string> = {
    "/villa-bruno": "/stay",
    "/accommodation": "/stay",
  }

  if (redirects[path]) {
    return NextResponse.redirect(new URL(redirects[path], request.url), 301)
  }

  // Then handle internationalization
  return intlMiddleware(request)
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|images|studio|favicon|assets|robots|_redirects|llms).*)",
  ],
}
