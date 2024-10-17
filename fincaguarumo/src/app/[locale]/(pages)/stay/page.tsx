import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"

const Accommodations = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const pageContent: { title: string; description: string; body: any } =
    await sanityFetch({
      query: PAGE_QUERY,
      revalidate: 0,
      params: { language: locale, pageName: "stay" },
    })

  const { title, description, body } = pageContent || {}

  return (
    <Layout
      locale={locale}
      pageName="stay"
      title={title}
      description={description}
      icon="Owl"
      body={body}
    />
  )
}
export default Accommodations
