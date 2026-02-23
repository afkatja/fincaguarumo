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
  const { slug } = await params

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

  const canonicalUrl = `${baseUrl}/en/blog/${slug}`
  const title = post?.title
    ? `${post.title} - Finca Guarumo Blog`
    : "Finca Guarumo Blog"

  const description =
    post?.description ||
    "Read about sustainable living, wildlife, and eco-tourism at Finca Guarumo in Costa Rica's Osa Peninsula."

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
      publishedTime: post.publishedAt || undefined,
      authors: ["Finca Guarumo"],
      images: post.mainImage?.url
        ? [
            {
              url: post.mainImage.url,
              width: 1200,
              height: 630,
              alt: post.title || undefined,
            },
          ]
        : [
            {
              url: "/images/finca-guarumo-v4.4.jpg",
              width: 1200,
              height: 630,
              alt: "Finca Guarumo Blog",
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.mainImage?.url
        ? [post.mainImage.url]
        : ["/images/finca-guarumo-v4.4.jpg"],
    },
  }
}
