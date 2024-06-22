import { NextRequest, NextResponse } from "next/server"
import { match } from "@formatjs/intl-localematcher"
//@ts-ignore-line
import Negotiator from "negotiator"

let locales = ["en", "nl", "es", "ru"]

function getLocale(request: NextRequest) {
  let headers = { "accept-language": "en-US,en;q=0.5" }
  let languages = new Negotiator({ headers }).languages()
  let defaultLocale = "en"
  return match(languages, locales, defaultLocale)
}

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(locale => {
    return pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  })

  if (pathnameHasLocale) return

  // Redirect if there is no locale
  const locale = getLocale(request)

  request.nextUrl.pathname = `/${locale}${pathname}`

  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next).*)",
    // Optional: only run on root (/) URL
    // '/'
  ],
}
