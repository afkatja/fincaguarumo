import { POST_QUERY_RESULT } from "../../../../../sanity.types"
import { sanityFetch } from "../../../../sanity/lib/client"
import { POST_QUERY } from "../../../../sanity/lib/queries"
import { notFound } from "next/navigation"
import { Post } from "./Post"
import { generateBlogMetadata } from "./metadata"

export { generateBlogMetadata as generateMetadata }

export default async function Page({ params }: { params: any }) {
  const { slug } = await params
  const post = await sanityFetch<POST_QUERY_RESULT>({
    query: POST_QUERY,
    params: { slug },
    revalidate: 0,
  })
  if (!post) return notFound()

  if (!post?.isPublished) notFound()

  return (
    <Post post={post} parent={{ title: "Blog", href: "blog" }} locale="en" />
  )
}
