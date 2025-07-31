import { POSTS_QUERYResult } from "../../sanity.types"
import FeaturedContent from "./FeaturedContent"
import TourItem from "../app/[locale]/(pages)/tours/TourItem"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"

export function Posts({
  posts: postsProp,
  locale,
}: {
  posts: POSTS_QUERYResult
  locale: string
}) {
  const posts = postsProp
    .filter(post => post.isPublished)
    .map(post => ({
      ...post,
      content: (
        <TourItem
          href={`/tours/${post?.slug?.current}`}
          mainImage={post?.mainImage as SanityImageObject & { alt: string }}
          title={post.title ?? ""}
          isFeatured
          description={""}
          slug={post.slug as { current: string }}
          isPublished
          locale={locale}
        />
      ),
    }))
  return <FeaturedContent href="tours" items={posts} />
}
