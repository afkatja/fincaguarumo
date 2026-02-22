import { Posts } from "@/app/[locale]/blog/Posts"
import { PAGE_QUERY, POSTS_QUERY } from "../../../sanity/lib/queries"
import { sanityFetch } from "../../../sanity/lib/client"
import { POSTS_QUERY_RESULT } from "../../../../sanity.types"
import PagesLayout from "../(pages)/pagesLayout"
import { SanityDocument } from "next-sanity"
import { Metadata } from "next"
import { locales } from "../../../config"

// Generate metadata for the blog page
export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: "en", pageName: "blog" },
  })

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl = `${baseUrl}/en/blog`

  return {
    title: pageContent?.title || "Blog - Finca Guarumo",
    description:
      pageContent?.description ||
      "Read our latest blog posts about wildlife, sustainability, and life at Finca Guarumo.",
    keywords:
      `blog, wildlife, sustainability, nature, Costa Rica, Osa Peninsula, Corcovado, birdwatching, eco-tourism, Finca Guarumo, jungle life, rural tourism, sustainable travel, nature photography, bird watching, conservation, eco-lodge, rainforest, biodiversity, tropical birds, nature education`
        .split(",")
        .map(k => k.trim())
        .filter(Boolean),
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageContent?.title || "Blog - Finca Guarumo",
      description:
        pageContent?.description ||
        "Read our latest blog posts about wildlife, sustainability, and life at Finca Guarumo.",
      url: canonicalUrl,
      type: "website",
      images: pageContent?.mainImage
        ? [
            {
              url: pageContent.mainImage.url,
              width: pageContent.mainImage.metadata?.dimensions?.width || 1200,
              height: pageContent.mainImage.metadata?.dimensions?.height || 630,
              alt: pageContent.mainImage.alt || "Finca Guarumo Blog",
            },
          ]
        : [
            {
              url: "/images/finca-guarumo-v4.4.jpg",
              width: 1200,
              height: 630,
              alt: "Finca Guarumo",
            },
          ],
    },
  }
}

export default async function Page({ params }: { params: any }) {
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: "en", pageName: "blog" },
  })
  const posts = await sanityFetch<POSTS_QUERY_RESULT>({
    query: POSTS_QUERY,
    revalidate: 0,
  })

  const postsOrdered = posts
    .filter(post => post.isPublished)
    .sort((a, b) => {
      if (a._createdAt < b._createdAt) return 1
      if (a._createdAt > b._createdAt) return -1
      return 0
    })

  return (
    <PagesLayout
      locale="en"
      pageName="blog"
      title={pageContent?.title}
      subtitle={pageContent?.subtitle}
      mainImage={pageContent?.mainImage}
      description={pageContent?.description}
    >
      <Posts posts={postsOrdered} locale="en" />
    </PagesLayout>
  )
}
