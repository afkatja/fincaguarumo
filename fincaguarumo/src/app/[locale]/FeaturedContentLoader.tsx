"use client"

import useSWR from "swr"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import TourItem from "./(pages)/tours/TourItem"
import FeaturedContent from "../../components/FeaturedContent"
import {
  FEATURED_POSTS_QUERY,
  FEATURED_TOURS_QUERY,
} from "../../sanity/lib/queries"

const sanityFetcher = (query: string, params?: any) =>
  clientSideFetch(query, params)

export default function FeaturedContentLoader({ locale }: { locale: string }) {
  const { data: tours } = useSWR(
    [FEATURED_TOURS_QUERY, { language: locale }],
    ([query, params]) => sanityFetcher(query, params)
  )

  const { data: posts } = useSWR(
    [FEATURED_POSTS_QUERY, { category: "featured", language: locale }],
    ([query, params]) => sanityFetcher(query, params)
  )

  if (!tours && !posts) return null

  const featuredTours =
    tours
      ?.filter((t: any) => t.isPublished)
      .map((tour: any) => ({
        ...tour,
        content: {
          [tour.slug.current]: (
            <TourItem
              href={`${locale}/tours/${tour.slug.current}`}
              mainImage={tour.mainImage}
              title={tour.title}
              isFeatured
              description={tour.description}
              slug={tour.slug}
              isPublished={tour.isPublished}
              locale={locale}
            />
          ),
        },
      })) ?? []

  const featuredPosts =
    posts
      ?.filter((p: any) => p.isPublished)
      .map((post: any) => ({
        ...post,
        content: {
          [post.slug.current]: (
            <TourItem
              href={`${locale}/blog/${post.slug.current}`}
              mainImage={post.mainImage}
              title={post.title}
              slug={post.slug}
              isPublished={post.isPublished}
              locale={locale}
            />
          ),
        },
      })) ?? []

  return (
    <>
      {featuredTours.length > 0 && (
        <FeaturedContent
          href="tours"
          featuredContentTitle="Featured Tours"
          items={featuredTours}
        />
      )}
      {featuredPosts.length > 0 && (
        <FeaturedContent
          href="blog"
          featuredContentTitle="Featured Posts"
          items={featuredPosts}
        />
      )}
    </>
  )
}
