import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
}
const Gallery = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const content: Content = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "gallery" },
  })

  return (
    <Layout
      locale={locale}
      pageName="gallery"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
      icon="Hawk"
    >
      <PortableText value={content?.body} />
    </Layout>
  )
}

export default Gallery
