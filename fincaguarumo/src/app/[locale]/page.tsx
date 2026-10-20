import { Metadata } from "next"
import { sanityFetch } from "../../sanity/lib/client"
import { HOME_QUERY } from "../../sanity/lib/queries"
import { HomeContent } from "../../types"
import HomePage from "./HomePage"

const baseUrl = "https://fincaguarumo.com"

const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

const jsonLd = (data: { locale: string }) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Finca Guarumo",
      url: "https://fincaguarumo.com",
      description:
        "Sustainable eco-lodge in Costa Rica's Osa Peninsula offering off-grid luxury accommodation near Corcovado National Park",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://fincaguarumo.com/search?q={search_term_string}",
        },
        queryInput: "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: "Finca Guarumo",
        url: "https://fincaguarumo.com",
      },
      inLanguage: data.locale,
    },
    {
      "@type": "LodgingBusiness",
      additionalType: "VacationRental",
      name: "Villa Bruno - Finca Guarumo",
      identifier: "villa-bruno-finca-guarumo",
      alternateName: "Finca Guarumo Villa Bruno",
      description:
        "Off-grid eco-villa in Costa Rica's Osa Peninsula near Corcovado National Park with 100% solar power, wildlife viewing, and sustainable luxury accommodation",
      url: "https://fincaguarumo.com/villa-bruno",
      telephone: "+506-87495341",
      email: "info@fincaguarumo.com",
      priceRange: "$$-$$$",
      currenciesAccepted: "USD",
      paymentAccepted: "Credit Card, Bank Transfer",
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
      checkinTime: "2024-11-01T15:00:00+00:00",
      checkoutTime: "2024-11-01T11:00:00+00:00",
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
      image: [
        "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
        "https://fincaguarumo.com/images/villa-bruno-interior.webp",
        "https://fincaguarumo.com/images/villa-bruno-terrace.jpg",
        "https://fincaguarumo.com/images/villa-bruno-bedroom.jpg",
        "https://fincaguarumo.com/images/villa-bruno-kitchen.jpg",
        "https://fincaguarumo.com/images/villa-bruno-bathroom.jpg",
        "https://fincaguarumo.com/images/villa-bruno-wildlife.jpg",
        "https://fincaguarumo.com/images/villa-bruno-sunset.jpg",
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
        "https://www.youtube.com/@FincaGuarumo",
      ],
    },
  ],
})

export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale } = await params

  const content: HomeContent = await sanityFetch({
    query: HOME_QUERY,
    params: { language: locale },
    revalidate: 60,
  })

  const title = content?.hero_title
    ? `${content.hero_title} - Finca Guarumo`
    : "Finca Guarumo"

  const description =
    content?.hero_slogan ||
    "Stay at Villa Bruno in Finca Guarumo – a private eco-luxury villa in Costa Rica's Osa Peninsula. Explore jungle trails, birdwatching, and rural life near Corcovado National Park."

  const canonicalUrl = baseUrl

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
      languages: {
        "x-default": canonicalUrl,
        [locale]: canonicalUrl,
      },
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
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo - Eco-Villa in Costa Rica's Osa Peninsula",
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
          url: "/images/finca-guarumo-v4.4.jpg",
          alt: "Finca Guarumo – Villa Bruno jungle view",
        },
      ],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

export default async function Home({ params }: { params: any }) {
  const { locale } = await params

  const content: HomeContent = await sanityFetch({
    query: HOME_QUERY,
    params: { language: locale },
    revalidate: 60,
  })

  return (
    <>
      <HomePage locale={locale} content={content} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd({ locale })).replace(/</g, "\\u003c"),
        }}
      />
    </>
  )
}