import { Metadata } from "next"
import { sanityFetch } from "@/sanity/lib/client"
import { TOURS_QUERY } from "@/sanity/lib/queries"
import { locales } from "@/config"

const baseUrl = "https://fincaguarumo.com"

interface TourData {
  title?: string
  description?: string
  slug?: { current: string }
  isPublished?: boolean
  price?: number
  mainImage?: {
    url?: string
  }
}

const tourJsonLd = (tour: TourData, locale: string) => ({
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  name: tour.title,
  description: tour.description,
  url:
    locale === "en"
      ? `${baseUrl}/tours/${tour.slug?.current}`
      : `${baseUrl}/${locale}/tours/${tour.slug?.current}`,
  provider: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: baseUrl,
  },
  location: {
    "@type": "Place",
    name: "Finca Guarumo, Osa Peninsula, Costa Rica",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Puerto Jiménez",
      addressRegion: "Puntarenas",
      addressCountry: "CR",
    },
  },
  offers: tour.price
    ? {
        "@type": "Offer",
        price: tour.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      }
    : undefined,
  image: tour.mainImage?.url ? [tour.mainImage.url] : undefined,
})

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string }
}): Promise<Metadata> {
  const { locale, slug } = params

  const tour: TourData = await sanityFetch({
    query: TOURS_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!tour?.isPublished) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const canonicalUrl =
    locale === "en"
      ? `${baseUrl}/tours/${slug}`
      : `${baseUrl}/${locale}/tours/${slug}`

  const title = tour?.title
    ? `${tour.title} - Finca Guarumo Tours`
    : "Finca Guarumo Tours"

  const description =
    tour?.description ||
    "Discover guided tours at Finca Guarumo in Costa Rica's Osa Peninsula. Experience wildlife, birdwatching, and sustainable eco-tourism."

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": `${baseUrl}/tours/${slug}`,
        ...Object.fromEntries(
          locales.map(loc => [
            loc,
            loc === "en"
              ? `${baseUrl}/tours/${slug}`
              : `${baseUrl}/${loc}/tours/${slug}`,
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
      images: tour.mainImage?.url
        ? [
            {
              url: tour.mainImage.url,
              width: 1200,
              height: 630,
              alt: tour.title,
            },
          ]
        : [
            {
              url: "/images/finca-guarumo-v4.4.jpg",
              width: 1200,
              height: 630,
              alt: "Finca Guarumo Tours",
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: tour.mainImage?.url
        ? [tour.mainImage.url]
        : ["/images/finca-guarumo-v4.4.jpg"],
    },
  }
}

export default function TourMetadata({
  tour,
  locale,
}: {
  tour: TourData
  locale: string
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(tourJsonLd(tour, locale)).replace(
          /</g,
          "\\u003c",
        ),
      }}
    />
  )
}
