import React from "react"
import { SanityDocument } from "next-sanity"
import { Metadata } from "next"
import { PAGE_QUERY, TOURS_QUERY } from "../../../../sanity/lib/queries"
import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { TourType } from "./TourItem"
import { getLocalizedUrl } from "@/lib/url"
import { localeMap } from "@/lib/schema/lodgingBusiness"

const baseUrl = "https://fincaguarumo.com"

function getImageUrl(image: TourType["mainImage"]): string {
  if (!image) return ""
  return image.url || ""
}

// Schema for Corcovado National Park (key attraction)
const corcovadoAttractionSchema = {
  "@type": "TouristAttraction",
  name: "Corcovado National Park",
  alternateName: "Parque Nacional Corcovado",
  description:
    "One of the most biodiverse places on Earth, covering 424 sq km of primary rainforest. Home to jaguars, tapirs, scarlet macaws, and all four Costa Rican monkey species.",
  url: "https://www.sinac.go.cr/EN/AC/acosa/corcovado/Paginas/default.aspx",
  image: "https://fincaguarumo.com/images/corcovado-national-park.jpg",
  geo: {
    "@type": "GeoCoordinates",
    latitude: 8.4542,
    longitude: -83.5583,
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Puerto Jiménez",
    addressRegion: "Puntarenas",
    addressCountry: "CR",
  },
  touristType: [
    "Wildlife enthusiasts",
    "Birdwatchers",
    "Hikers",
    "Nature photographers",
    "Eco-tourists",
  ],
  includesAttraction: [
    {
      "@type": "TouristAttraction",
      name: "Sirena Ranger Station",
      description: "Main ranger station with highest wildlife density",
    },
    {
      "@type": "TouristAttraction",
      name: "La Leona Ranger Station",
      description: "Northern entrance, 45 minutes from Villa Bruno",
    },
  ],
}

// Schema for Golfo Dulce
const golfoDulceAttractionSchema = {
  "@type": "TouristAttraction",
  name: "Golfo Dulce",
  alternateName: "Gulf of Dulce",
  description:
    "Tropical fjord and marine sanctuary. One of only four tropical fjords worldwide. Home to humpback whales (Jul-Oct), dolphins year-round, and sea turtles.",
  url: "https://www.golfodulce.org/",
  image: "https://fincaguarumo.com/images/golfo-dulce.jpg",
  geo: {
    "@type": "GeoCoordinates",
    latitude: 8.55,
    longitude: -83.3,
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Puerto Jiménez",
    addressRegion: "Puntarenas",
    addressCountry: "CR",
  },
  touristType: [
    "Whale watchers",
    "Dolphin enthusiasts",
    "Kayakers",
    "Marine wildlife photographers",
  ],
}

// Schema for the tours page with ItemList
const toursPageJsonLd = (data: {
  locale: string
  tours: TourType[]
  url: string
}) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ItemList",
      name: "Finca Guarumo Guided Tours & Experiences",
      description:
        "Curated wildlife tours, birdwatching expeditions, Corcovado National Park hikes, and marine adventures from Villa Bruno at Finca Guarumo.",
      url: data.url,
      numberOfItems: data.tours.length,
      itemListElement: data.tours.map((tour, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TouristTrip",
          name: tour.title,
          description: tour.description || "",
          url: `${baseUrl}/tours/${tour.slug.current}`,
          image: getImageUrl(tour.mainImage) || undefined,
          startLocation: {
            "@type": "Place",
            name: "Villa Bruno at Finca Guarumo",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Calle La Balsa, 6 km from Puerto Jiménez",
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
          },
          offers: {
            "@type": "Offer",
            availability: "https://schema.org/InStock",
            priceCurrency: "USD",
          },
        },
      })),
    },
    corcovadoAttractionSchema,
    golfoDulceAttractionSchema,
    {
      "@type": "LodgingBusiness",
      additionalType: "VacationRental",
      name: "Villa Bruno at Finca Guarumo",
      url: `${baseUrl}/villa-bruno`,
      description:
        "Base for all tours - off-grid eco-villa with 100% solar power, Starlink WiFi, and exceptional on-property wildlife viewing.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Calle La Balsa, 6 km from Puerto Jiménez",
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
    },
  ],
})

// Generate metadata for the tours page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    params: { pageName: "tours", language: locale },
    revalidate: 0,
  })

  const canonicalUrl = getLocalizedUrl("/tours", locale)

  return {
    title: pageContent?.title || "Tours - Finca Guarumo",
    description:
      pageContent?.description ||
      "Explore our guided tours and wildlife experiences at Finca Guarumo in Costa Rica.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: getLocalizedUrl("/tours", "en"),
        es: getLocalizedUrl("/tours", "es"),
        ru: getLocalizedUrl("/tours", "ru"),
        nl: getLocalizedUrl("/tours", "nl"),
        de: getLocalizedUrl("/tours", "de"),
      },
    },
    openGraph: {
      title: pageContent?.title || "Tours - Finca Guarumo",
      description:
        pageContent?.description ||
        "Explore our guided tours and wildlife experiences at Finca Guarumo in Costa Rica.",
      url: canonicalUrl,
      type: "website",
      locale: localeMap[locale] || "en_US",
    },
  }
}

const Tours = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  const toursContent = await sanityFetch<TourType[]>({
    query: TOURS_QUERY,
    revalidate: 0,
    params: { language: locale },
  })

  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    params: { pageName: "tours", language: locale },
    revalidate: 0,
  })
  const tours = toursContent.filter(tour => tour.isPublished)

  const headerImage = tours[Math.floor(Math.random() * tours.length)].mainImage
  const canonicalUrl = getLocalizedUrl("/tours", locale)

  return (
    <Layout
      locale={locale}
      pageName="tours"
      title={pageContent?.title}
      description={pageContent?.description}
      mainImage={headerImage}
    >
      <ClientPage tours={tours} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            toursPageJsonLd({
              locale,
              tours,
              url: canonicalUrl,
            }),
          ).replace(/</g, "\\u003c"),
        }}
      />
    </Layout>
  )
}

export default Tours
