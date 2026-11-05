import { notFound } from "next/navigation"
import { Metadata } from "next"

import { sanityFetch } from "@/sanity/lib/client"
import {
  ACCOMMODATION_QUERY,
  ACTIVITY_BLOCK_QUERY,
  WHY_CHOOSE_VILLA_BRUNO_QUERY,
} from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import AccommodationClientPage from "./AccommodationClientPage"
import {
  ActivityBlock,
  FAQType,
  SanityImageObject,
  WhyChooseData,
} from "@/types"
import { PricingRule } from "@/lib/pricingEngine"
import {
  buildLodgingBusinessSchema,
  localeMap,
  gbpUrl,
  airbnbUrl,
} from "@/lib/schema/lodgingBusiness"
import { orgSchema } from "@/lib/villa-json-ld"
import { getLocalizedUrl } from "@/lib/url"

const slug = "villa-bruno"

function getImageUrl(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as any).url || ""
}

function getImageAlt(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as any).alt || ""
}

function buildVillaBrunoSchema(data: {
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
}) {
  return buildLodgingBusinessSchema({
    name: data.title,
    identifier: `villa-bruno-finca-guarumo`,
    description:
      data.description ||
      "Villa Bruno, off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing",
    url: data.url,
    floorSizeValue: 56,
    occupancyMax: 4,
    reviewCount: 36,
    starRating: "5",
    price: 117.0,
    priceCurrency: "USD",
    checkinTime: data.checkInTime || "2026-11-01T15:00:00+00:00",
    checkoutTime: data.checkOutTime || "2026-11-01T11:00:00+00:00",
    validFrom: "2026-01-01",
    images: [
      "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
      "https://fincaguarumo.com/images/villa-bruno-interior.webp",
      "https://fincaguarumo.com/images/villa-bruno-terrace.jpg",
      "https://fincaguarumo.com/images/villa-bruno-bedroom.jpg",
      "https://fincaguarumo.com/images/villa-bruno-kitchen.jpg",
      "https://fincaguarumo.com/images/villa-bruno-bathroom.jpg",
      "https://fincaguarumo.com/images/villa-bruno-wildlife.jpg",
      "https://fincaguarumo.com/images/villa-bruno-sunset.jpg",
    ],
    knowsAbout: [
      "Eco-tourism",
      "Wildlife viewing",
      "Sustainable travel",
      "Corcovado National Park",
      "Birdwatching",
      "Rainforest conservation",
      "Farm-to-table dining",
      "Local organic produce",
    ],
    sameAs: [
      "https://www.instagram.com/fincaguarumo.osa",
      "https://www.facebook.com/fincaguarumoosa",
      "https://www.youtube.com/@FincaGuarumo",
      gbpUrl,
      airbnbUrl,
    ],
    hasMap: gbpUrl,
    mainImage: data.mainImage,
  })
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
  "@graph": [buildVillaBrunoSchema(data), orgSchema],
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
    category: string
    checkInTime?: string
    checkOutTime?: string
    earlyCheckIn?: boolean
    earlyCheckInFee?: number
    lateCheckOut?: boolean
    lateCheckOutFee?: number
    instructions?: string
    contactInfo?: string
    address?: string
    distance?: string
  }>
  translations?: Array<{
    language: string
    slug: { current: string }
    title: string
    description: string
  }>
  activityBlocks?: Array<{
    title: string
    subtitle?: string
    description?: string
    slug: { current: string }
    mainImage?: SanityImageObject
    activities: Array<{
      name: string
      description?: string
      season?: string
      duration?: string
      distanceFromVilla?: string
      transportIncluded?: boolean
      difficulty?: string
      highlights?: string[]
      icon?: string
      isFeatured?: boolean
      sortOrder?: number
    }>
  }>
  whyChooseVillaBruno?: {
    title: string
    subtitle?: string
    description?: string
    slug: { current: string }
    mainImage?: SanityImageObject
    comparisonTable: Array<{
      feature: string
      villaBruno: string
      largeEcoResorts?: string
      corcovadoLodges?: string
      traditionalHotels?: string
      otherVacationRentals?: string
      category?: string
      sortOrder?: number
      isHighlight?: boolean
    }>
    keyDifferentiators: Array<{
      title: string
      description: string
      icon?: string
      sortOrder?: number
    }>
    idealFor?: string[]
    lessSuitableFor?: string[]
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
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

  const canonicalUrl = getLocalizedUrl(`/${slug}`, locale)

  const title = content?.title
    ? `${content?.title} - Finca Guarumo`
    : "Finca Guarumo"

  const description = content?.description
    ? content?.description
    : "Villa Bruno, off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing"

  // Build hreflang alternates only for locales with actual translations
  const languages: Record<string, string> = {
    "x-default": getLocalizedUrl(`/${slug}`, "en"),
    [locale]: canonicalUrl,
  }

  if (content.translations) {
    for (const t of content.translations) {
      if (t.language && t.language !== locale && t.slug?.current) {
        languages[t.language] = getLocalizedUrl(
          `/${t.slug.current}`,
          t.language,
        )
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
    metadataBase: new URL("https://fincaguarumo.com"),
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

const AccommodationPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}) => {
  const { locale } = await params

  const [content, activityBlocks, whyChoose] = await Promise.all([
    sanityFetch<AccommodationContent>({
      query: ACCOMMODATION_QUERY,
      params: { slug, language: locale },
      revalidate: 0,
    }),
    sanityFetch<ActivityBlock[]>({
      query: ACTIVITY_BLOCK_QUERY,
      params: { language: locale },
      revalidate: 0,
    }),
    sanityFetch<WhyChooseData | null>({
      query: WHY_CHOOSE_VILLA_BRUNO_QUERY,
      params: { language: locale },
      revalidate: 0,
    }),
  ])

  if (!content?.isPublished) notFound()

  const canonicalUrl = getLocalizedUrl(`/${slug}`, locale)

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
      <AccommodationClientPage
        content={content}
        locale={locale}
        activityBlocks={activityBlocks}
        whyChoose={whyChoose}
      />

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
