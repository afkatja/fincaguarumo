import { SanityDocument } from "sanity"
import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"

const Salsa = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "salsa" },
  })

  return (
    <Layout
      locale={locale}
      pageName="tours"
      title={pageContent?.title}
      description={pageContent?.description}
      icon="Owl"
    >
      <PortableText value={pageContent?.body} />
    </Layout>
  )
}
export default Salsa
