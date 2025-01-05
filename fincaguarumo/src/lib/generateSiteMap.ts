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

const generateUrl = (type: string, item: SanityDocument) => {
  return {
    url: `/${type}/${item.slug.current}`,
    lastmod: new Date(item._updatedAt).toISOString(),
    changefreq: "weekly",
    priority: 0.7,
  }
}

export const generateSitemap = async () => {
  const { posts, tours, pages } = await fetchContent()
  const urls = [
    ...posts.map(post => generateUrl("blog", post)),
    ...tours.map(tour => generateUrl("tours", tour)),
    ...pages.map(page => generateUrl("pages", page)),
  ]

  const sitemap = xml({
    urls,
  })

  return sitemap.toString()
}
