import { SanityDocument } from "next-sanity"
import { sanityFetch } from "../sanity/lib/client"
import xml from "xml"
import {
  ALL_PAGES_QUERY,
  POSTS_QUERY,
  TOURS_QUERY,
} from "../sanity/lib/queries"

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

const locales = ["en", "es", "ru", "nl", "de"]
const generateLocalizedUrls = (type: string, item: SanityDocument) => {
  return locales.map(locale => ({
    url: `/${locale}/${type}/${item.slug.current}`,
    lastmod: new Date(item._updatedAt).toISOString(),
    changefreq: "weekly",
    priority: 0.7,
  }))
}

export const generateSitemap = async () => {
  const { posts, tours, pages } = await fetchContent()

  // Add main gallery page
  const mainGalleryUrl = () => {
    return locales.map(locale => ({
      url: `${locale}/gallery`,
      lastmod: new Date().toISOString(),
      changefreq: "weekly",
      priority: 0.7,
    }))
  }

  const mainPages = () => {
    return locales.map(locale => ({
      url: `/${locale}`,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 1.0,
    }))
  }
  const urls = [
    ...mainPages(),
    ...posts.flatMap(post => generateLocalizedUrls("blog", post)),
    ...tours.flatMap(tour => generateLocalizedUrls("tours", tour)),
    ...pages.flatMap(page => generateLocalizedUrls("pages", page)),
    ...mainGalleryUrl(),
  ]

  const sitemap = xml({
    urls,
  })

  return sitemap.toString()
}
