import { Metadata } from "next"
import { notFound } from "next/navigation"
import { sanityFetch } from "@/sanity/lib/client"
import { LOCATION_PAGE_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import { getLocalizedUrl } from "@/lib/url"
import { getTranslations } from "next-intl/server"
import { localeMap } from "@/lib/schema/lodgingBusiness"
import MapEmbed from "./MapEmbed"
import DirectionsList from "./DirectionsList"
import NearbyAttractions from "./NearbyAttractions"
import LocalTransport from "./LocalTransport"

const slug = "location"

interface LocationPageContent {
  isPublished?: boolean
  title?: string
  subtitle?: string
  description?: string
  mainImage?: { url: string; alt?: string }
  coordinates?: { lat: number; lng: number }
  address?: {
    formatted?: string
    street?: string
    city?: string
    region?: string
    country?: string
    postalCode?: string
  }
  googleMapsUrl?: string
  appleMapsUrl?: string
  wazeUrl?: string
  directions?: Array<{
    fromLocation: string
    customFromLabel?: string
    transportMode: string
    duration: string
    distance: string
    roadConditions?: string
    stepByStep?: Array<{
      stepNumber: number
      instruction: string
      landmark?: string
    }>
    tips?: string[]
    costEstimate?: string
    bookingRequired?: boolean
    contactForBooking?: string
  }>
  localTransport?: Array<{
    name: string
    type: string
    description?: string
    contact?: string
    website?: string
    languages?: string[]
  }>
  nearbyAttractions?: Array<{
    name: string
    description?: string
    distance: string
    category: string
    coordinates?: { lat: number; lng: number }
    image?: { url: string; alt?: string }
  }>
  seoKeywords?: string[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const content = await sanityFetch<LocationPageContent>({
    query: LOCATION_PAGE_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!content?.isPublished) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const t = await getTranslations("location")
  const title =
    content?.title || t("title", { defaultValue: "Location & Directions" })

  const canonicalUrl = getLocalizedUrl(`/${slug}`, locale)

  return {
    title,
    description:
      content?.description ||
      t("description", {
        defaultValue:
          "Find Villa Bruno at Finca Guarumo – directions from San José, Puerto Jiménez, Panama, and more. Map, GPS coordinates, and local transport options.",
      }),
    metadataBase: new URL("https://fincaguarumo.com"),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": getLocalizedUrl(`/${slug}`, "en"),
        [locale]: canonicalUrl,
      },
    },
    openGraph: {
      title,
      description:
        content?.description ||
        t("description", {
          defaultValue: "Location & Directions to Villa Bruno at Finca Guarumo",
        }),
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      locale: localeMap[locale] || "en_US",
      images: [
        {
          url: content?.mainImage?.url || "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo Location Map",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description:
        content?.description ||
        t("description", {
          defaultValue: "Location & Directions to Villa Bruno",
        }),
      images: [content?.mainImage?.url || "/images/finca-guarumo-v4.4.jpg"],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

const LocationPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}) => {
  const { locale } = await params

  const content = await sanityFetch<LocationPageContent>({
    query: LOCATION_PAGE_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })
  console.log({ content })

  if (!content?.isPublished) notFound()

  const t = await getTranslations("location")

  return (
    <Layout
      locale={locale}
      pageName="location"
      title={content?.title || t("title")}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      <div className="w-11/12 mx-auto py-8 space-y-12">
        {/* Map Section */}
        <section className="space-y-4" aria-labelledby="map-heading">
          <h2 id="map-heading" className="text-2xl font-semibold">
            {t("mapTitle", { defaultValue: "Where We Are" })}
          </h2>
          <MapEmbed
            coordinates={content.coordinates}
            googleMapsUrl={content.googleMapsUrl}
            appleMapsUrl={content.appleMapsUrl}
            wazeUrl={content.wazeUrl}
            address={content.address}
          />
        </section>

        {/* Directions Section */}
        <section className="space-y-4" aria-labelledby="directions-heading">
          <h2 id="directions-heading" className="text-2xl font-semibold">
            {t("directionsTitle", { defaultValue: "How to Get Here" })}
          </h2>
          <p className="text-muted-foreground">
            {t("directionsIntro", {
              defaultValue:
                "Villa Bruno is located on the Osa Peninsula, 6 km from Puerto Jiménez. Choose your starting point for detailed directions.",
            })}
          </p>
          <DirectionsList directions={content.directions || []} />
        </section>

        {/* Local Transport Section */}
        {content.localTransport && content.localTransport.length > 0 && (
          <section
            className="space-y-4"
            aria-labelledby="local-transport-heading"
          >
            <h2 id="local-transport-heading" className="text-2xl font-semibold">
              {t("localTransportTitle", {
                defaultValue: "Local Transport Options",
              })}
            </h2>
            <LocalTransport transport={content.localTransport} />
          </section>
        )}

        {/* Nearby Attractions Section */}
        {content.nearbyAttractions && content.nearbyAttractions.length > 0 && (
          <section className="space-y-4" aria-labelledby="attractions-heading">
            <h2 id="attractions-heading" className="text-2xl font-semibold">
              {t("nearbyAttractionsTitle", {
                defaultValue: "Nearby Attractions",
              })}
            </h2>
            <NearbyAttractions attractions={content.nearbyAttractions} />
          </section>
        )}

        {/* Address & Contact */}
        <section
          className="space-y-2 pt-8 border-t"
          aria-labelledby="contact-heading"
        >
          <h2 id="contact-heading" className="text-xl font-semibold">
            {t("contactTitle", { defaultValue: "Address & Contact" })}
          </h2>
          <address className="not-italic text-muted-foreground space-y-1">
            <p>
              {content.address?.formatted ||
                "Calle La Balsa, 6 km from Puerto Jiménez"}
            </p>
            <p>
              {content.address?.city}, {content.address?.region}{" "}
              {content.address?.postalCode}
            </p>
            <p>{content.address?.country}</p>
            <p>
              GPS: {content.coordinates?.lat?.toFixed(6)},{" "}
              {content.coordinates?.lng?.toFixed(6)}
            </p>
          </address>
        </section>
      </div>
    </Layout>
  )
}

export default LocationPage
