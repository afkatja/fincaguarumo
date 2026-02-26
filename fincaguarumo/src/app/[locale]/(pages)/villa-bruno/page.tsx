import { notFound } from "next/navigation"
import { Metadata } from "next"

import { sanityFetch } from "@/sanity/lib/client"
import { ACCOMMODATION_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import AccommodationClientPage from "./AccommodationClientPage"
import { FAQType, SanityImageObject } from "@/types"
import { PricingRule } from "@/lib/pricingEngine"
import { title } from "process"

const slug = "villa-bruno"

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
  url: `https://fincaguarumo.com/${slug}`,
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

export type AccommodationContent = {
  title: string
  subtitle?: string
  description: string
  summary?: string
  mainImage: SanityImageObject
  body: any
  slug: { current: string }
  isPublished: boolean
  showBookingOptions: boolean
  showBookingDialog: boolean
  slideshow: {
    images: SanityImageObject[]
  }
  pricingRules?: PricingRule[]
  categories?: { title: string }[]
  faq?: FAQType[]
  capacity?: number
  bedrooms?: number
  bathrooms?: number
  propertyType?: string
  location?: {
    address?: string
    city?: string
    region?: string
    country?: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  highlightFeatures?: Array<{
    title: string
    description: string
    icon?: string
  }>
  checkInTime?: string
  checkOutTime?: string
  amenities?: Array<{
    title: string
    description: string
    icon?: string
  }>
  paymentMethods?: Array<{
    title: string
    description: string
    type?: string
  }>
  cancellationPolicy?: {
    title: string
    description: string
    rules?: string[]
  }
  logistics?: Array<{
    title: string
    description: string
    type?: string
  }>
}

export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale } = await params

  const content: AccommodationContent = await sanityFetch({
    query: ACCOMMODATION_QUERY,
    params: { slug: "villa-bruno", language: locale },
    revalidate: 0,
  })

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${locale}/${slug}`

  const title = content?.title
    ? `${content?.title} - Finca Guarumo`
    : "Finca Guarumo"

  const description = content?.description
    ? content?.description
    : "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing"

  // Enhanced keywords for accommodation pages
  const keywords =
    `eco-villa, sustainable accommodation, Costa Rica, Osa Peninsula, Villa Bruno, eco-luxury, solar power, off-grid, wildlife viewing, Corcovado National Park, Puerto Jimenez, jungle retreat, nature vacation, sustainable travel, eco-tourism, birdwatching, rainforest accommodation, luxury villa, private villa, romantic getaway, nature immersion, regenerative tourism, solar powered villa, eco-lodge Costa Rica, sustainable hospitality, green travel, carbon neutral accommodation, wildlife sanctuary, biodiversity hotspot, pristine nature, exclusive retreat, eco-friendly lodging`
      .split(",")
      .map(k => k.trim())
      .filter(Boolean)

  return {
    title,
    description,
    keywords,
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": `${baseUrl}/${slug}`,
        ...Object.fromEntries(
          ["en", "es", "ru", "de", "nl"].map(loc => [
            loc,
            loc === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${loc}/${slug}`,
          ]),
        ),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: `${content?.title || "Finca Guarumo"} - Eco-Villa in Costa Rica`,
        },
      ],
    },
  }
}

const AccommodationPage = async ({ params }: { params: any }) => {
  const { locale } = await params

  const content: AccommodationContent = await sanityFetch({
    query: ACCOMMODATION_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!content?.isPublished) notFound()

  return (
    <Layout
      locale={locale}
      pageName="Villa Bruno"
      title={content?.title}
      subtitle={content?.subtitle}
      description={content?.description}
      mainImage={content?.mainImage}
      images={content?.slideshow?.images}
    >
      <AccommodationClientPage content={content} locale={locale} />
      <script type="application/ld+json">
        {JSON.stringify(
          jsonLd({ title: content?.title, slug: content?.slug }),
        ).replace(/</g, "\\u003c")}
      </script>
    </Layout>
  )
}

export default AccommodationPage
