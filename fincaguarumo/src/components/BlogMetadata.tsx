import { Metadata } from "next"
import { sanityFetch } from "@/sanity/lib/client"
import { POSTS_QUERY } from "@/sanity/lib/queries"
import { locales } from "@/config"
import { POST_QUERY_RESULT } from "../../sanity.types"

const baseUrl = "https://fincaguarumo.com"

interface PostData {
  title?: string
  description?: string
  slug?: { current: string }
  publishedAt?: string
  mainImage?: any // Using any to match Sanity's complex image type
  body?: any
  isPublished?: boolean
}

const blogJsonLd = (post: POST_QUERY_RESULT, locale: string) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post?.title,
  description: post?.description,
  url: `${baseUrl}/en/blog/${post?.slug?.current}`,
  datePublished: post?.publishedAt,
  dateModified: post?.publishedAt,
  author: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: baseUrl,
  },
  publisher: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: baseUrl,
  },
  image: post?.mainImage?.url ? [post?.mainImage.url] : undefined,
})

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string }
}): Promise<Metadata> {
  const { locale, slug } = params

  const post: POST_QUERY_RESULT = await sanityFetch({
    query: POSTS_QUERY,
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

export default function BlogMetadata({ post }: { post: POST_QUERY_RESULT }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(blogJsonLd(post, "en")).replace(/</g, "\\u003c"),
      }}
    />
  )
}
