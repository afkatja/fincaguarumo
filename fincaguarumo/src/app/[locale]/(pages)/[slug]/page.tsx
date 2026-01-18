import React from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"

import { sanityFetch } from "@/sanity/lib/client"
import { PAGES_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { getTranslations } from "next-intl/server"
import { FAQType, SanityImageObject } from "@/types"
import Script from "next/script"

const jsonLd = (data: { title: string; slug: { current: string } }) => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: `${data.title} - Finca Guarumo`,
  alternateName: ["Villa Bruno", "Villa Bruno at Finca Guarumo"],
  partOf: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: "https://fincaguarumo.com",
  },
  branchOf: {
    "@type": "Organization",
    name: "Finca Guarumo",
  },
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

export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale, slug } = await params

  const content: Content = await sanityFetch({
    query: PAGES_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })
  return {
    title: content?.title
      ? `${content?.title} - Finca Guarumo`
      : "Finca Guarumo",
    description: content?.description
      ? content?.description
      : "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing",
    openGraph: {
      title: content?.title
        ? `${content?.title} - Finca Guarumo`
        : "Finca Guarumo",
      description: content?.description
        ? content?.description
        : "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing",
      url: `https://fincaguarumo.com/${slug.current}`,
      siteName: "Finca Guarumo",
    },
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

  // Load translations
  const messages = await getTranslations(locale)

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
      <ClientPage content={content} locale={locale} />
      <Script
        id={"json-ld-page"}
        strategy="afterInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLd({ title: content?.title, slug: content?.slug }),
          ).replace(/</g, "\\u003c"),
        }}
      />
    </Layout>
  )
}

export default Page
