import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"

const Salsa = async ({ params }: { params: any }) => {
  const { locale } = await params
  const pageContent: {
    title: string
    description: string
    body: any
    mainImage: SanityImageObject
  } = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "salsa" },
  })

  const { title, description, body, mainImage } = pageContent || {}

  return (
    <Layout
      locale={locale}
      pageName="salsa"
      title={title}
      description={description}
      icon="Salsa"
      mainImage={mainImage}
      body={body}
    />
  )
}
export default Salsa
