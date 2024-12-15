import { QueryParams } from "next-sanity"
import {
  POST_QUERYResult,
  POSTS_QUERYResult,
} from "../../../../../sanity.types"
import { client, sanityFetch } from "../../../../sanity/lib/client"
import { POST_QUERY, POSTS_QUERY } from "../../../../sanity/lib/queries"
import { notFound } from "next/navigation"
import { Post } from "./Post"

// export async function generateStaticParams() {
//   const posts = await client.fetch<POSTS_QUERYResult>(
//     POSTS_QUERY,
//     {},
//     { perspective: "published" }
//   )

//   return posts.map(post => ({
//     slug: post?.slug?.current,
//   }))
// }

export default async function Page({ params }: { params: any }) {
  const { locale, slug } = await params
  const post = await sanityFetch<POST_QUERYResult>({
    query: POST_QUERY,
    params: { slug, lanaguage: locale },
    revalidate: 0,
  })
  if (!post) return notFound()

  if (!post?.isPublished) return notFound()

  return <Post post={post} parent={{ title: "Blog", href: "blog" }} />
}
