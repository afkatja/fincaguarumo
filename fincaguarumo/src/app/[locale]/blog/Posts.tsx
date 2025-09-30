"use client"
import { POSTS_QUERYResult } from "../../../../sanity.types"
import FeaturedContent from "../../../components/FeaturedContent"
import TourItem from "../(pages)/tours/TourItem"
import { usePathname } from "next/navigation"

export function Posts({
  posts: postsProp,
  locale,
}: {
  posts: POSTS_QUERYResult
  locale: string
}) {
  const pathname = usePathname()

  const posts = postsProp
    .filter(post => post.isPublished && post.slug?.current)
    .map(post => ({
      ...post,
      content: {
        [post.slug?.current as string]: (
          <TourItem
            href={`${pathname}/${post?.slug?.current}`}
            // @ts-expect-error
            mainImage={
              typeof post?.mainImage === "object"
                ? {
                    ...post?.mainImage,
                    alt: post?.mainImage?.alt ?? "",
                    url: post?.mainImage?.url ?? "",
                    metadata: post?.mainImage?.metadata,
                  }
                : null
            }
            title={post.title ?? ""}
            description={""}
            slug={post.slug as { current: string }}
            isPublished={post.isPublished ?? false}
            locale={locale}
          />
        ),
      },
    }))
  return <FeaturedContent href={pathname} items={posts} />
}
