import { SanityDocument } from "next-sanity"
import { sanityFetch } from "../sanity/lib/client"
import {
  ALL_PAGES_QUERY,
  POSTS_QUERY,
  TOURS_QUERY,
} from "../sanity/lib/queries"
import { MetadataRoute } from "next"
import { locales } from "../config"

const baseUrl = "https://fincaguarumo.com"

const fetchContent = async (): Promise<{
  posts: SanityDocument[]
  tours: SanityDocument[]
  pages: SanityDocument[]
}> => {
  const [posts, tours, pages] = await Promise.all([
    sanityFetch({ query: POSTS_QUERY }) as Promise<SanityDocument[]>,
    sanityFetch({ query: TOURS_QUERY, params: { language: "en" } }) as Promise<
      SanityDocument[]
    >,
    sanityFetch({ query: ALL_PAGES_QUERY }) as Promise<SanityDocument[]>,
  ])

  return { posts, tours, pages }
}

export const generateSitemap = async () => {
  const { posts, tours, pages } = await fetchContent()

  const urls: MetadataRoute.Sitemap = []

  // Homepage for all locales
  locales.forEach(locale => {
    const url = locale === "en" ? baseUrl : `${baseUrl}/${locale}`
    urls.push({
      url,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          locales.map(loc => [
            loc,
            loc === "en" ? baseUrl : `${baseUrl}/${loc}`,
          ])
        ),
      },
      changeFrequency: "daily" as const,
      priority: 1.0,
    })
  })

  // Gallery (not translated - English only for now)
  urls.push({
    url: `${baseUrl}/gallery`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  })

  // Blog posts (English only - not translated)
  posts.forEach(post => {
    urls.push({
      url: `${baseUrl}/blog/${post.slug.current}`,
      lastModified: new Date(post._updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  })

  // Tours (translated - all locales)
  tours.forEach(tour => {
    locales.forEach(locale => {
      const url =
        locale === "en"
          ? `${baseUrl}/tours/${tour.slug.current}`
          : `${baseUrl}/${locale}/tours/${tour.slug.current}`

      urls.push({
        url,
        lastModified: new Date(tour._updatedAt),
        alternates: {
          languages: Object.fromEntries(
            locales.map(loc => [
              loc,
              loc === "en"
                ? `${baseUrl}/tours/${tour.slug.current}`
                : `${baseUrl}/${loc}/tours/${tour.slug.current}`,
            ])
          ),
        },
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    })
  })

  // Pages (assuming translated - all locales)
  pages.forEach(page => {
    locales.forEach(locale => {
      const url =
        locale === "en"
          ? `${baseUrl}/pages/${page.slug.current}`
          : `${baseUrl}/${locale}/pages/${page.slug.current}`

      urls.push({
        url,
        lastModified: new Date(page._updatedAt),
        alternates: {
          languages: Object.fromEntries(
            locales.map(loc => [
              loc,
              loc === "en"
                ? `${baseUrl}/pages/${page.slug.current}`
                : `${baseUrl}/${loc}/pages/${page.slug.current}`,
            ])
          ),
        },
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })
    })
  })

  return urls
}
