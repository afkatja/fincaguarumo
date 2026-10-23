import { SanityDocument } from "next-sanity"
import { sanityFetch } from "../sanity/lib/client"
import {
  ACCOMMODATION_QUERY,
  ALL_PAGES_QUERY,
  POSTS_QUERY,
  TOURS_QUERY,
} from "../sanity/lib/queries"
import { MetadataRoute } from "next"
import { locales } from "../config"

const baseUrl = "https://fincaguarumo.com"

const localeNames: Record<string, string> = {
  en: "en",
  nl: "nl-NL",
  es: "es-CR",
  ru: "ru-RU",
  de: "de-DE",
}

const fetchContent = async (): Promise<{
  posts: SanityDocument[]
  tours: SanityDocument[]
  pages: SanityDocument[]
  accommodation: SanityDocument
}> => {
  const [posts, tours, pages, accommodation] = await Promise.all([
    sanityFetch({ query: POSTS_QUERY }) as Promise<SanityDocument[]>,
    sanityFetch({ query: TOURS_QUERY, params: { language: "en" } }) as Promise<
      SanityDocument[]
    >,
    sanityFetch({ query: ALL_PAGES_QUERY }) as Promise<SanityDocument[]>,
    sanityFetch({
      query: ACCOMMODATION_QUERY,
      params: { language: "en", slug: "villa-bruno" },
    }) as Promise<SanityDocument>,
  ])

  return { posts, tours, pages, accommodation }
}

function getUrlForLocale(path: string, locale: string): string {
  if (locale === "en") {
    return path === "/" ? baseUrl : `${baseUrl}${path}`
  }
  return `${baseUrl}/${locale}${path}`
}

function buildAlternates(pathsByLocale: Record<string, string>): MetadataRoute.Sitemap[0]["alternates"] {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    const path = pathsByLocale[locale]
    if (path) {
      languages[locale] = getUrlForLocale(path, locale)
    }
  }
  // x-default points to English version
  if (pathsByLocale.en) {
    languages["x-default"] = getUrlForLocale(pathsByLocale.en, "en")
  }
  return { languages }
}

function safeDate(dateString: string | undefined): Date {
  if (!dateString) return new Date()
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? new Date() : date
}

export const generateSitemap = async () => {
  const { posts, tours, pages, accommodation } = await fetchContent()

  const urls: MetadataRoute.Sitemap = []

  // Determine which locales have actual content for each page type
  // For now: homepage and static pages exist in all locales (even if content is English fallback)
  // But per SEO audit, we should only declare hreflang for locales with REAL translated content
  // Since only English is fully translated, we only include 'en' for most pages
  // Tours and accommodation have translation structure in Sanity

  // 1. Homepage - only English is canonical (root /)
  // Non-English homepages serve English content -> don't include in sitemap
  urls.push({
    url: baseUrl,
    lastModified: new Date(),
    alternates: buildAlternates({ en: "/" }),
    changeFrequency: "daily" as const,
    priority: 1.0,
  })

  // 2. Static pages - only include English versions since translations don't exist
  const staticPages = [
    { path: "/villa-bruno", priority: 0.9, changeFrequency: "weekly" as const, lastmod: new Date() },
    { path: "/about", priority: 0.9, changeFrequency: "monthly" as const, lastmod: new Date() },
    { path: "/faq", priority: 0.85, changeFrequency: "weekly" as const, lastmod: new Date() },
    { path: "/reviews", priority: 0.9, changeFrequency: "weekly" as const, lastmod: new Date() },
    { path: "/tours", priority: 0.85, changeFrequency: "weekly" as const, lastmod: new Date() },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" as const, lastmod: new Date() },
    { path: "/gallery", priority: 0.7, changeFrequency: "weekly" as const, lastmod: new Date() },
  ]

  for (const page of staticPages) {
    // Check if any non-English locale has this page translated
    const hasTranslation = pages.some(p => p.slug.current === page.path.replace("/", "") && p.language !== "en")
    const alternates = buildAlternates({ en: page.path })
    urls.push({
      url: getUrlForLocale(page.path, "en"),
      lastModified: page.lastmod,
      alternates,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })
  }

  // 3. Accommodation (Villa Bruno) - check for translations
  if (accommodation?.isPublished) {
    const slug = accommodation.slug.current
    const path = `/${slug}`
    const alternates = buildAlternates({ en: path }) // Add other locales if translations exist
    urls.push({
      url: getUrlForLocale(path, "en"),
      lastModified: safeDate(accommodation._updatedAt),
      alternates,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })
  }

  // 4. Tours - include for locales where translation exists
  for (const tour of tours) {
    if (!tour.isPublished) continue
    const slug = tour.slug.current
    const path = `/tours/${slug}`

    // Build alternates only for locales that have this tour translated
    const pathsByLocale: Record<string, string> = { en: path }
    if (tour.translations) {
      for (const t of tour.translations) {
        if (t.language && t.language !== "en" && t.slug?.current) {
          pathsByLocale[t.language] = `/tours/${t.slug.current}`
        }
      }
    }
    const alternates = buildAlternates(pathsByLocale)

    urls.push({
      url: getUrlForLocale(path, "en"),
      lastModified: safeDate(tour._updatedAt),
      alternates,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  }

  // 5. Pages from Sanity - only include locales with actual translations
  for (const page of pages) {
    if (!page.isPublished) continue
    const slug = page.slug.current
    const path = `/${slug}`

    const pathsByLocale: Record<string, string> = { en: path }
    if (page.translations) {
      for (const t of page.translations) {
        if (t.language && t.language !== "en" && t.slug?.current) {
          pathsByLocale[t.language] = `/${t.slug.current}`
        }
      }
    }
    const alternates = buildAlternates(pathsByLocale)

    urls.push({
      url: getUrlForLocale(path, "en"),
      lastModified: safeDate(page._updatedAt),
      alternates,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  }

  // 6. Blog posts - English only (not translated)
  for (const post of posts) {
    if (!post.isPublished) continue
    const slug = post.slug.current
    const path = `/blog/${slug}`

    urls.push({
      url: getUrlForLocale(path, "en"),
      lastModified: safeDate(post._updatedAt),
      alternates: buildAlternates({ en: path }),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  }

  return urls
}