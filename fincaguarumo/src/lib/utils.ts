import { type ClassValue, clsx } from "clsx"
import { Slug } from "sanity"
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
