import { Posts } from "@/components/Posts"
import { POSTS_QUERY } from "../../../sanity/lib/queries"
import { sanityFetch } from "../../../sanity/lib/client"
import { POSTS_QUERYResult } from "../../../../sanity.types"
import PagesLayout from "../(pages)/pagesLayout"

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  const posts = await sanityFetch<POSTS_QUERYResult>({
    query: POSTS_QUERY,
  })

  return (
    <PagesLayout
      locale={locale}
      pageName="tours"
      title={""}
      description={"pageContent?.description"}
      icon="Aracari"
    >
      <Posts posts={posts} />
    </PagesLayout>
  )
}
