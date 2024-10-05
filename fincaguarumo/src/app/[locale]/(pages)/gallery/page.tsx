import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"
import Gallery from "./Gallery"
import Carousel from "@/components/Carousel"
import { urlFor } from "../../../../sanity/lib/image"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
  gallery?: any[]
}
const GalleryPage = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const content: Content = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "gallery" },
  })
  const gallery = content?.gallery || []
  const images = gallery.map(item => ({
    src: urlFor(item).height(700).url(),
    ...item,
  }))
  return (
    <Layout
      locale={locale}
      pageName="gallery"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      {content?.body && <PortableText value={content?.body} />}
      {gallery && <Gallery gallery={gallery} />}
      <Carousel
        useArrows={false}
        images={images}
        options={{ loop: true }}
        className="bg-white py-5 overflow-hidden"
      />
    </Layout>
  )
}

export default GalleryPage
