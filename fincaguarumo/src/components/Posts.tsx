import { POSTS_QUERYResult } from "../../sanity.types"
import FeaturedContent from "./FeaturedContent"
import TourItem from "../app/[locale]/(pages)/tours/TourItem"
import { SanityImageObject } from "../types"

export function Posts({
  posts: postsProp,
  locale,
}: {
  posts: POSTS_QUERYResult
  locale: string
}) {
  const posts = postsProp
    .filter(post => post.isPublished && post.slug?.current)
    .map(post => ({
      ...post,
      content: (
        <TourItem
          href={`/tours/${post?.slug?.current}`}
          mainImage={post?.mainImage as SanityImageObject & { alt: string }}
          title={post.title ?? ""}
          isFeatured={post.isPublished ?? false}
          description={""}
          slug={post.slug as { current: string }}
          isPublished={post.isPublished ?? false}
          locale={locale}
        />
      ),
    }))
  return <FeaturedContent href="tours" items={posts} />
}
