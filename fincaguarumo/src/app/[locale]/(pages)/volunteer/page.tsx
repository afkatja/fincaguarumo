import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"
import RichText from "../../../../components/RichText"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
}
const Volunteer = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const content: Content = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "volunteer" },
  })

  return (
    <Layout
      locale={locale}
      pageName="volunteer"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      <RichText body={content?.body} />
    </Layout>
  )
}

export default Volunteer
