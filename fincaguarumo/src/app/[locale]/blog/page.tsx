import { Posts } from "@/components/Posts"
import { PAGE_QUERY, POSTS_QUERY } from "../../../sanity/lib/queries"
import { sanityFetch } from "../../../sanity/lib/client"
import { POSTS_QUERYResult } from "../../../../sanity.types"
import PagesLayout from "../(pages)/pagesLayout"
import { SanityDocument } from "next-sanity"
import { Metadata } from "next"

// Generate metadata for the blog page
export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale } = await params
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "blog" },
  })

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl = `${baseUrl}/${locale}/blog`

  return {
    title: pageContent?.title || "Blog - Finca Guarumo",
    description:
      pageContent?.description ||
      "Read our latest blog posts about wildlife, sustainability, and life at Finca Guarumo.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/en/blog`,
        es: `${baseUrl}/es/blog`,
        ru: `${baseUrl}/ru/blog`,
        nl: `${baseUrl}/nl/blog`,
        de: `${baseUrl}/de/blog`,
      },
    },
    openGraph: {
      title: pageContent?.title || "Blog - Finca Guarumo",
      description:
        pageContent?.description ||
        "Read our latest blog posts about wildlife, sustainability, and life at Finca Guarumo.",
      url: canonicalUrl,
      type: "website",
    },
  }
}

export default async function Page({ params }: { params: any }) {
  const { locale } = await params
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "blog" },
  })
  const posts = await sanityFetch<POSTS_QUERYResult>({
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
      locale={locale}
      pageName="blog"
      title={pageContent?.title}
      subtitle={pageContent?.subtitle}
      mainImage={pageContent?.mainImage}
      description={pageContent?.description}
    >
      <Posts posts={postsOrdered} locale={locale} />
    </PagesLayout>
  )
}
