import { POST_QUERY_RESULT } from "../../../../../sanity.types"
import { sanityFetch } from "../../../../sanity/lib/client"
import { POST_QUERY } from "../../../../sanity/lib/queries"
import { notFound } from "next/navigation"
import { Post } from "./Post"

export default async function Page({ params }: { params: any }) {
  const { locale, slug } = await params
  const post = await sanityFetch<POST_QUERY_RESULT>({
    query: POST_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })
  if (!post) return notFound()

  if (!post?.isPublished) notFound()

  return (
    <Post
      post={post}
      parent={{ title: "Blog", href: "blog" }}
      locale={locale}
    />
  )
}
