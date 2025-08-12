import React from "react"
import { notFound } from "next/navigation"
import type { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGES_QUERY } from "../../../../sanity/lib/queries"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { loadTranslations } from "../../../../lib/utils"

export type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
  slug: { current: string }
  isPublished: boolean
  showBookingOptions: boolean
  showBookingDialog: boolean
  slideshow: {
    images: SanityImageObject[]
  }
  price?: number
}

const Page = async ({ params }: { params: any }) => {
  const { locale, slug } = await params
  const content: Content = await sanityFetch({
    query: PAGES_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!content?.isPublished) notFound()

  // Load translations
  const messages = await loadTranslations(locale)

  return (
    <Layout
      locale={locale}
      pageName={slug}
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
      images={content?.slideshow?.images}
    >
      <ClientPage content={content} locale={locale} messages={messages} />
    </Layout>
  )
}

export default Page
