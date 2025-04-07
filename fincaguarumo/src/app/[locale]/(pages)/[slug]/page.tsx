import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGES_QUERY } from "../../../../sanity/lib/queries"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"
import RichText from "@/components/RichText"
import { notFound } from "next/navigation"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
  slug: { current: string }
  isPublished: boolean
  slideshow: {
    images: SanityImageObject[]
  }
}
const Page = async ({ params }: { params: any }) => {
  const { locale, slug } = await params
  const content: Content = await sanityFetch({
    query: PAGES_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!content?.isPublished) notFound()

  return (
    <Layout
      locale={locale}
      pageName={slug}
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
      images={content?.slideshow?.images}
    >
      <RichText body={content?.body} />
    </Layout>
  )
}

export default Page
