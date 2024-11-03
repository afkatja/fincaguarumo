import { Posts } from "@/components/Posts"
import { PAGE_QUERY, POSTS_QUERY } from "../../../sanity/lib/queries"
import { sanityFetch } from "../../../sanity/lib/client"
import { POSTS_QUERYResult } from "../../../../sanity.types"
import PagesLayout from "../(pages)/pagesLayout"
import { SanityDocument } from "next-sanity"

export default async function Page({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "blog" },
  })
  const posts = await sanityFetch<POSTS_QUERYResult>({
    query: POSTS_QUERY,
    revalidate: 0,
  })

  const postsOrdered = posts.sort((a, b) => {
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
      <Posts posts={postsOrdered} />
    </PagesLayout>
  )
}
