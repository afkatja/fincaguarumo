import { POST_QUERY_RESULT } from "../../../../../sanity.types"
import { sanityFetch } from "../../../../sanity/lib/client"
import { POST_QUERY } from "../../../../sanity/lib/queries"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { locales } from "../../../../config"
import { Post } from "./Post"

const baseUrl = "https://fincaguarumo.com"

export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale, slug } = await params

  const post = await sanityFetch<POST_QUERY_RESULT>({
    query: POST_QUERY,
    params: { slug },
    revalidate: 0,
  })

  if (!post || !post.isPublished) {
    return {}
  }

  const og = post.openGraph || {}

  const canonicalUrl = `${baseUrl}/en/blog/${slug}`

  const baseTitle =
    (og as { title?: string }).title || post.title || "Finca Guarumo"
  const title = `${baseTitle} - Finca Guarumo`

  const description =
    typeof (og as { description?: string }).description === "string"
      ? (og as { description?: string }).description
      : "Read our latest stories and updates from Finca Guarumo."

  const imageSource =
    typeof (og as { image?: any }).image === "object" &&
    (og as { image?: any }).image !== null
      ? (og as { image?: any }).image
      : post.mainImage
  const imageUrl = imageSource?.url
  const imageWidth = imageSource?.metadata?.dimensions?.width
  const imageHeight = imageSource?.metadata?.dimensions?.height
  const imageAlt =
    imageSource?.alt || post.title || "Finca Guarumo blog post image"

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: (og as { url?: string | undefined }).url || canonicalUrl,
      siteName: "Finca Guarumo",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: imageWidth,
              height: imageHeight,
              alt: imageAlt,
            },
          ]
        : undefined,
    },
  }
}

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
