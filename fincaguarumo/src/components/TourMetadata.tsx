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

// This component is now client-side only - server-only metadata generation moved to metadata.ts

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
