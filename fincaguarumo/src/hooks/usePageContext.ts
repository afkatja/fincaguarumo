"use client"

import { usePathname } from "@/navigation"
import { useParams } from "next/navigation"

export type PageType = "homepage" | "villa-bruno" | "other"

export function usePageContext(): {
  page: PageType
  propertySlug?: string
} {
  const pathname = usePathname()
  const { locale } = useParams()

  // Remove locale from pathname for analysis
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, "")

  // Homepage detection
  if (pathnameWithoutLocale === "" || pathnameWithoutLocale === "/") {
    return { page: "homepage" }
  }

  // Property/stay page detection
  // Check for known property slugs or patterns
  const propertyPatterns = [
    "/villa-bruno", // Primary property page
    "/stay", // Legacy pageType page
    "/accommodation",
    "/villas",
  ]

  const isPropertyPage = propertyPatterns.some(pattern =>
    pathnameWithoutLocale.includes(pattern),
  )

  // Also check if it's a slug-based page (dynamic property pages)
  const slugPattern = /^\/([^\/]+)$/
  const slugMatch = pathnameWithoutLocale.match(slugPattern)

  if (
    isPropertyPage ||
    (slugMatch &&
      slugMatch[1] &&
      !slugMatch[1].startsWith("admin") &&
      !slugMatch[1].startsWith("api"))
  ) {
    const propertySlug = slugMatch?.[1] || pathnameWithoutLocale.split("/")[1]
    return {
      page: "villa-bruno",
      propertySlug,
    }
  }

  return { page: "other" }
}
