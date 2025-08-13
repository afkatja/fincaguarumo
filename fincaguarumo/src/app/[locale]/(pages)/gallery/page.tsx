import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { GALLERY_QUERY, PAGE_QUERY } from "../../../../sanity/lib/queries"
import Layout from "../pagesLayout"
import Carousel from "@/components/Carousel"
import { urlFor } from "../../../../sanity/lib/image"
import { SanityImageObject } from "../../../../types"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
  gallery?: any[]
}
const GalleryPage = async ({ params }: { params: any }) => {
  const { locale } = await params

  const content: Content = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "gallery" },
  })

  const gallery: { title: string; images: SanityImageObject[] } =
    await sanityFetch({
      query: GALLERY_QUERY,
      revalidate: 0,
      params: { category: "General" },
    })

  const images = gallery?.images.map(item => ({
    _type: item._type || "image",
    asset: item.asset,
    alt: item.alt || "",
    src: urlFor(item)
      .width(2016)
      .height(1134)
      .fit("scale")
      .quality(100)
      .format("webp")
      .url(),
    width: 2016,
    height: 1134,
  }))
  return (
    <Layout
      locale={locale}
      pageName="gallery"
      title={content?.title}
      description={content?.description}
    >
      <Carousel
        useArrows={false}
        images={images}
        options={{ loop: true }}
        className="bg-transparent py-5 lg:py-8 overflow-hidden"
      />
    </Layout>
  )
}

export default GalleryPage
