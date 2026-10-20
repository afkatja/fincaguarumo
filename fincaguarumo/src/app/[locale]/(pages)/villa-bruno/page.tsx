import { notFound } from "next/navigation"
import { Metadata } from "next"

import { sanityFetch } from "@/sanity/lib/client"
import { ACCOMMODATION_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import AccommodationClientPage from "./AccommodationClientPage"
import { FAQType, SanityImageObject } from "@/types"
import { PricingRule } from "@/lib/pricingEngine"

const slug = "villa-bruno"

function getImageUrl(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as any).url || ""
}

function getImageAlt(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as any).alt || ""
}

const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

const jsonLd = (data: {
  title: string
  slug: { current: string }
  description?: string
  locale: string
  url: string
  mainImage?: SanityImageObject
  capacity?: number
  bedrooms?: number
  bathrooms?: number
  checkInTime?: string
  checkOutTime?: string
  amenities?: Array<{ title: string; description: string; icon?: string }>
}) => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  additionalType: "VacationRental",
  name: data.title,
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
    data.description ||
    "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing",
  url: data.url,
  address: {
    "@type": "PostalAddress",
    streetAddress: "6 km from Puerto Jiménez",
    addressLocality: "Puerto Jiménez",
    addressRegion: "Puntarenas",
    postalCode: "60702",
    addressCountry: "CR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 8.496420632614996,
    longitude: -83.3341457939961,
  },
  telephone: "+506-87495341",
  email: "info@fincaguarumo.com",
  priceRange: "$$-$$$",
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Bank Transfer",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "100% Solar Power System", value: true },
    { "@type": "LocationFeatureSpecification", name: "Starlink Satellite Internet", value: true },
    { "@type": "LocationFeatureSpecification", name: "Filtered Spring Water System", value: true },
    { "@type": "LocationFeatureSpecification", name: "Wildlife Viewing Platform", value: true },
    { "@type": "LocationFeatureSpecification", name: "Kitchen Facilities", value: true },
    { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: false },
    { "@type": "LocationFeatureSpecification", name: "Private Bathroom", value: true },
    { "@type": "LocationFeatureSpecification", name: "Outdoor Terrace", value: true },
    { "@type": "LocationFeatureSpecification", name: "Free Parking", value: true },
    { "@type": "LocationFeatureSpecification", name: "LGBTQ+ inclusive / zero-discrimination policy", value: true },
  ],
  petsAllowed: false,
  smokingAllowed: false,
  checkinTime: data.checkInTime || "2024-11-01T15:00:00+00:00",
  checkoutTime: data.checkOutTime || "2024-11-01T11:00:00+00:00",
  numberOfRooms: 1,
  floorSize: {
    "@type": "QuantitativeValue",
    value: 54,
    unitCode: "MTK",
  },
  occupancy: {
    "@type": "QuantitativeValue",
    maxValue: 4,
  },
  starRating: {
    "@type": "Rating",
    ratingValue: "5",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 5,
    reviewCount: 11,
    bestRating: 5,
    worstRating: 1,
  },
  image: getImageUrl(data.mainImage) ? [getImageUrl(data.mainImage)] : [
    "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
    "https://fincaguarumo.com/images/villa-bruno-interior.webp",
  ],
  hasMap: "https://maps.app.goo.gl/GAfQHZfeW8ZtKPkk8",
  makesOffer: [
    {
      "@type": "Offer",
      itemtype: "https://schema.org/Offer",
      identifier: "villa-bruno-standard-rate",
      name: "Villa Bruno Standard Rate",
      description: "Sustainable accommodation with wildlife viewing",
      checkinTime: "2024-11-01T15:00:00+00:00",
      checkoutTime: "2024-11-01T11:00:00+00:00",
      price: 89.0,
      priceCurrency: "USD",
      itemOffered: {
        "@type": "HotelRoom",
        name: "Villa Bruno Main Unit",
        occupancy: {
          "@type": "QuantitativeValue",
          value: 4,
          maxValue: 4,
        },
      },
      priceSpecification: {
        "@type": "CompoundPriceSpecification",
        price: 89.0,
        priceCurrency: "USD",
      },
      availability: "https://schema.org/InStock",
      validFrom: "2024-01-01",
      url: "https://fincaguarumo.com/villa-bruno",
    },
  ],
  tourBookingPage: "https://fincaguarumo.com/tours",
  knowsAbout: [
    "Eco-tourism",
    "Wildlife viewing",
    "Sustainable travel",
    "Corcovado National Park",
    "Birdwatching",
    "Rainforest conservation",
  ],
  areaServed: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: 8.496420632614996,
      longitude: -83.3341457939961,
    },
    geoRadius: 50,
  },
  sameAs: [
    "https://www.instagram.com/fincaguarumo.osa",
    "https://www.facebook.com/fincaguarumoosa",
  ],
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
  translations?: Array<{
    language: string
    slug: { current: string }
    title: string
    description: string
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

  if (!content?.isPublished) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${locale}/${slug}`

  const title = content?.title
    ? `${content?.title} - Finca Guarumo`
    : "Finca Guarumo"

  const description = content?.description
    ? content?.description
    : "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing"

  // Build hreflang alternates only for locales with actual translations
  const languages: Record<string, string> = {
    "x-default": canonicalUrl,
    [locale]: canonicalUrl,
  }

  if (content.translations) {
    for (const t of content.translations) {
      if (t.language && t.language !== locale && t.slug?.current) {
        const altUrl =
          t.language === "en"
            ? `${baseUrl}/${t.slug.current}`
            : `${baseUrl}/${t.language}/${t.slug.current}`
        languages[t.language] = altUrl
      }
    }
  }

  // Use page-specific image if available, fallback to default
  const ogImageUrl = getImageUrl(content?.mainImage)
    ? getImageUrl(content.mainImage)
    : "/images/finca-guarumo-v4.4.jpg"
  const ogImageAlt = getImageAlt(content?.mainImage)
    ? getImageAlt(content.mainImage)
    : `${content?.title || "Villa Bruno"} - Eco-Villa in Costa Rica`

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      locale: localeMap[locale] || "en_US",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@fincaguarumo",
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: ogImageAlt,
        },
      ],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
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

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${locale}/${slug}`

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLd({
              title: content?.title,
              slug: content?.slug,
              description: content?.description,
              locale,
              url: canonicalUrl,
              mainImage: content?.mainImage,
              capacity: content?.capacity,
              bedrooms: content?.bedrooms,
              bathrooms: content?.bathrooms,
              checkInTime: content?.checkInTime,
              checkOutTime: content?.checkOutTime,
              amenities: content?.amenities,
            }),
          ).replace(/</g, "\\u003c"),
        }}
      />
    </Layout>
  )
}

export default AccommodationPage