import { locales } from "../config"

const baseUrl = "https://fincaguarumo.com"

export function getLocalizedUrl(path: string, locale: string): string {
  if (!locales.includes(locale)) locale = "en"
  if (locale === "en") {
    return `${baseUrl}${path}`
  }
  return `${baseUrl}/${locale}${path}`
}

export function getLocalizedPath(path: string, locale: string): string {
  if (!locales.includes(locale)) locale = "en"
  if (locale === "en") {
    return path
  }
  return `/${locale}${path}`
}

export function getCanonicalUrl(path: string, locale: string): string {
  return getLocalizedUrl(path, locale)
}

export function buildHreflangAlternates(
  path: string,
  currentLocale: string,
  translations?: Array<{ language: string; slug?: { current: string } }>
): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": getLocalizedUrl(path, "en"),
    [currentLocale]: getLocalizedUrl(path, currentLocale),
  }

  if (translations) {
    for (const t of translations) {
      if (t.language && t.language !== currentLocale && t.slug?.current) {
        const altPath = path.includes("/blog/") || path.includes("/tours/")
          ? path.replace(/\/[^/]+$/, `/${t.slug.current}`)
          : `/${t.slug.current}`
        languages[t.language] = getLocalizedUrl(altPath, t.language)
      }
    }
  }

  return languages
}

/**
 * English is the source locale and is always treated as translated,
 * even when Sanity has no translation.metadata document yet.
 */
export function hasTranslation(
  translations: Array<{ language: string; slug?: { current: string } }> | undefined,
  locale: string
): boolean {
  if (locale === "en") return true
  if (!translations) return false
  return translations.some(t => t.language === locale && t.slug?.current)
}