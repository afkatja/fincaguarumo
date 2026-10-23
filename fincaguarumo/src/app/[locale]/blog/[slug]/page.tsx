import { POST_QUERY_RESULT } from "../../../../../sanity.types"
import { sanityFetch } from "../../../../sanity/lib/client"
import { POST_QUERY } from "../../../../sanity/lib/queries"
import { notFound } from "next/navigation"
import { Post } from "./Post"
import { generateBlogMetadata } from "./metadata"
import { getLocalizedUrl } from "@/lib/url"

export { generateBlogMetadata as generateMetadata }

function getImageUrl(image: any): string {
  if (!image) return ""
  return image.url || ""
}

function getImageAlt(image: any): string {
  if (!image) return ""
  return image.alt || ""
}

const blogPostJsonLd = (post: NonNullable<POST_QUERY_RESULT>) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.description || post.tldr,
  url: getLocalizedUrl(`/blog/${post.slug.current}`, "en"),
  datePublished: post.publishedAt || new Date().toISOString(),
  dateModified: post.publishedAt || new Date().toISOString(),
  author: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: "https://fincaguarumo.com",
  },
  publisher: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: "https://fincaguarumo.com",
    logo: {
      "@type": "ImageObject",
      url: "https://fincaguarumo.com/logo.png",
    },
  },
  image: getImageUrl(post.mainImage)
    ? [getImageUrl(post.mainImage)]
    : ["https://fincaguarumo.com/images/finca-guarumo-v4.4.jpg"],
  inLanguage: "en",
  isPartOf: {
    "@type": "Blog",
    name: "Finca Guarumo Blog",
    url: getLocalizedUrl("/blog", "en"),
  },
  articleSection: "Eco-Tourism",
  keywords: "eco-tourism, sustainable travel, Costa Rica, Osa Peninsula, wildlife, birdwatching",
})

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const post = await sanityFetch<POST_QUERY_RESULT>({
    query: POST_QUERY,
    params: { slug },
    revalidate: 0,
  })
  if (!post || !post.isPublished) notFound()

  // TypeScript narrows the type after notFound()
  const publishedPost = post!

  return (
    <>
      <Post post={publishedPost} parent={{ title: "Blog", href: "blog" }} locale="en" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostJsonLd(publishedPost)).replace(/</g, "\\u003c"),
        }}
      />
    </>
  )
}