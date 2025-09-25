import React from "react"
import { notFound } from "next/navigation"

import { sanityFetch } from "@/sanity/lib/client"
import { PAGES_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { loadTranslations } from "@/lib/utils"
import { FAQType, SanityImageObject } from "@/types"
import Script from "next/script"

const jsonLd = (data: { title: string; slug: { current: string } }) => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: `${data.title} - Finca Guarumo`,
  description:
    "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing",
  url: `https://fincaguarumo.com/${data.slug.current}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Puerto Jiménez",
    addressRegion: "Puntarenas",
    addressCountry: "CR",
  },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Solar Power" },
    { "@type": "LocationFeatureSpecification", name: "Starlink Internet" },
    { "@type": "LocationFeatureSpecification", name: "Wildlife Viewing" },
  ],
  numberOfRooms: 1,
  maximumAttendeeCapacity: 4,
})

export type Content = {
  title: string
  subtitle?: string
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
  categories?: { title: string }[]
  faq?: FAQType[]
}

const Page = async ({ params }: { params: any }) => {
  const { locale, slug } = await params

  const content: Content = await sanityFetch({
    query: PAGES_QUERY,
    params: { slug, language: "en" },
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
      subtitle={content?.subtitle}
      description={content?.description}
      mainImage={content?.mainImage}
      images={content?.slideshow?.images}
    >
      <ClientPage content={content} locale={locale} messages={messages} />
      <Script
        id={"json-ld-page"}
        strategy="afterInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLd({ title: content?.title, slug: content?.slug })
          ).replace(/</g, "\\u003c"),
        }}
      />
    </Layout>
  )
}

export default Page
