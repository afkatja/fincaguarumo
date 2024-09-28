import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"
import Image from "next/image"
import { urlFor } from "../../../../sanity/lib/image"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
  gallery?: any[]
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
  const gallery = content?.gallery || []
  return (
    <Layout
      locale={locale}
      pageName="gallery"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
      icon="Hawk"
    >
      {content?.body && <PortableText value={content?.body} />}
      <section className="flex flex-wrap">
        {gallery.map(item => (
          <div className="flex-1 m-2 hover:flex-5" key={crypto.randomUUID()}>
            <Image src={urlFor(item).url()} alt={""} width={600} height={600} />
          </div>
        ))}
      </section>
    </Layout>
  )
}

export default Gallery
