import { POST_QUERY_RESULT } from "../../sanity.types"
import { getLocalizedUrl } from "@/lib/url"

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
  url: getLocalizedUrl(`/blog/${post?.slug?.current}`, locale),
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

// This component is now server-rendered JSON-LD - client-side only usage removed

export default function BlogMetadata({ post, locale = "en" }: { post: POST_QUERY_RESULT; locale?: string }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify(blogJsonLd(post, locale)).replace(/</g, "\\u003c")}
    </script>
  )
}
