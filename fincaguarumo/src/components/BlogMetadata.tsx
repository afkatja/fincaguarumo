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

// This component is now client-side only - server-only metadata generation moved to page.tsx

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
