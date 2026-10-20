import { Metadata } from "next"
import { sanityFetch } from "@/sanity/lib/client"
import { POST_QUERY } from "@/sanity/lib/queries"
import { POST_QUERY_RESULT } from "../../../../../sanity.types"

const baseUrl = "https://fincaguarumo.com"

export async function generateBlogMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params

  const post: POST_QUERY_RESULT = await sanityFetch({
    query: POST_QUERY,
    params: { slug },
    revalidate: 0,
  })

  if (!post) {
    return {
      robots: "noindex, nofollow",
    }
  }

  if (!post.isPublished) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const canonicalUrl = `${baseUrl}/en/blog/${slug}`
  const title = post?.title
    ? `${post.title} - Finca Guarumo Blog`
    : "Finca Guarumo Blog"

  const description =
    post?.description ||
    "Read about sustainable living, wildlife, and eco-tourism at Finca Guarumo in Costa Rica's Osa Peninsula."

  const publishedTime = post.publishedAt || new Date().toISOString()
  const modifiedTime = post.publishedAt || new Date().toISOString()

  function getImageUrl(image: any): string {
    if (!image) return ""
    return image.url || ""
  }

  function getImageAlt(image: any): string {
    if (!image) return ""
    return image.alt || ""
  }

  const ogImageUrl = getImageUrl(post.mainImage)
    ? getImageUrl(post.mainImage)
    : "/images/finca-guarumo-v4.4.jpg"
  const ogImageAlt = getImageAlt(post.mainImage)
    ? getImageAlt(post.mainImage)
    : "Finca Guarumo Blog"

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": canonicalUrl,
        en: canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "article",
      publishedTime,
      modifiedTime,
      authors: ["Finca Guarumo"],
      locale: "en_US",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      "og:locale": "en_US",
    },
  }
}