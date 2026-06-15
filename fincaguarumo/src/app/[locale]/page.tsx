import { sanityFetch } from "../../sanity/lib/client"
import { HOME_QUERY } from "../../sanity/lib/queries"
import { HomeContent } from "../../types"
import HomePage from "./HomePage"

export default async function Home({ params }: { params: any }) {
  const { locale } = await params

  const content: HomeContent = await sanityFetch({
    query: HOME_QUERY,
    params: { language: locale },
    revalidate: 60,
  })

  return <HomePage locale={locale} content={content} />
}
