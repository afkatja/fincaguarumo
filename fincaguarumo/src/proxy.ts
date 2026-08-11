import createMiddleware from "next-intl/middleware"
import { createServerClient } from "@supabase/ssr"
import { locales } from "./config"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
})

export default async function proxy(request: NextRequest) {
  // Handle internationalization first
  const response = intlMiddleware(request)

  const locale = request.nextUrl.pathname.split("/")[1]
  const detectedLocale = locales.includes(locale) ? locale : "en"
  response.headers.set("Content-Language", detectedLocale)

  // Check if the request is for an admin route (after locale prefix)
  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.match(/\/admin(\/|$)/)
  // Exclude login and unauthorized pages from admin auth check
  const isAuthPage =
    pathname.match(/\/admin\/login(\/|$)/) ||
    pathname.match(/\/unauthorized(\/|$)/)

  if (isAdminRoute && !isAuthPage) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // Get user from session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      // Redirect to login if not authenticated
      const redirectUrl = new URL(`/${detectedLocale}/admin/login`, request.url)
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is admin using service role
    const { createClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (!userData?.is_admin) {
      // Redirect to unauthorized page if not admin
      return NextResponse.redirect(
        new URL(`/${detectedLocale}/unauthorized`, request.url),
      )
    }

    return response
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths including admin routes
    "/((?!api|_next/static|_next/image|images|studio|favicon|assets|robots|_redirects|llms|sitemap.xml).*)",
  ],
}
