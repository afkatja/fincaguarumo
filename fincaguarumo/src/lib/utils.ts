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
  }[]
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
  context: SlugValidationContext
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
