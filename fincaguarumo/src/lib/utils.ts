import { type ClassValue, clsx } from "clsx"
import { Slug, SlugValidationContext } from "sanity"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getTranslations = (
  translations: {
    language: string
    title: string
    slug: Slug
  }[],
) =>
  translations
    .filter(ref => ref?.slug?.current)
    .map(ref => {
      const lang = ref.language
      const langSlug = ref.slug.current

      return {
        language: ref.language,
        title: ref.title,
        path: "/" + [lang, langSlug].join("/"),
      }
    })

export async function isUniqueOtherThanLanguage(
  slug: string,
  context: SlugValidationContext,
) {
  const { document, getClient } = context
  if (!document?.language) {
    return true
  }
  const client = getClient({ apiVersion: "2023-04-24" })
  const id = document._id.replace(/^drafts\./, "")
  const params = {
    draft: `drafts.${id}`,
    published: id,
    language: document.language,
    slug,
  }
  const query = `!defined(*[
    !(_id in [$draft, $published]) &&
    slug.current == $slug &&
    language == $language
  ][0]._id)`
  const result = await client.fetch(query, params)
  return result
}

export const titleCase = (str: string) =>
  str.charAt(0).toUpperCase() + str.substring(1).toLowerCase()

export const shuffle = (array: any[]) => {
  let arr = array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
  return arr
}

export const getInternationalizedValue = (
  field: Array<{ _key: string; value: string }> | undefined,
  currentLanguage: string,
  fallback?: string,
): string => {
  if (!field || !Array.isArray(field)) return fallback || ""

  // First try the current language
  let value = field.find(item => item._key === currentLanguage)?.value
  if (value) return value

  // Fall back to English
  value = field.find(item => item._key === "en")?.value
  if (value) return value

  // Finally, use the provided fallback
  return fallback || ""
}

/**
 * Validates a redirectTo parameter to prevent open redirect vulnerabilities.
 * Only accepts same-origin relative paths (starting with / but not // or /\\).
 * Falls back to the provided default for absolute URLs, protocol-relative URLs,
 * or otherwise unsafe values.
 */
export function validateRedirectTo(
  redirectTo: string | null | undefined,
  fallback: string,
): string {
  if (!redirectTo) return fallback

  // Must be a relative path starting with /
  if (!redirectTo.startsWith("/")) return fallback

  // Reject protocol-relative URLs (//example.com) and backslash paths (/\...)
  if (redirectTo.startsWith("//") || redirectTo.startsWith("/\\")) {
    return fallback
  }

  // Accept valid internal paths
  return redirectTo
}
