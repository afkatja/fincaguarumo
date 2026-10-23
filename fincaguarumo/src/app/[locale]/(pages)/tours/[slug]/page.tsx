import { sanityFetch } from "@/sanity/lib/client"
import { DIALOG_QUERY, TOUR_QUERY } from "@/sanity/lib/queries"
import { IDialog, TTour, SanityImageObject } from "@/types"
import TourPage from "./TourPage"
import { generateTourMetadata } from "./metadata"
import { getLocalizedUrl } from "@/lib/url"

export { generateTourMetadata as generateMetadata }

function getImageUrl(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as any).url || ""
}

const tourJsonLd = (tour: TTour) => ({
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  name: tour.title,
  description: tour.description,
  url: tour.slug?.current ? getLocalizedUrl(`/tours/${tour.slug.current}`, "en") : "https://fincaguarumo.com/tours",
  provider: {
    "@type": "Organization",
    name: "Finca Guarumo",
    url: "https://fincaguarumo.com",
  },
  offers: {
    "@type": "Offer",
    name: tour.title,
    description: tour.description,
    url: tour.slug?.current ? getLocalizedUrl(`/tours/${tour.slug.current}`, "en") : "https://fincaguarumo.com/tours",
    price: tour.price || 0,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  duration: tour.duration ? `PT${tour.duration}H` : undefined,
  itinerary: tour.body
    ? tour.body
        .filter((block: any) => block._type === "block")
        .map((block: any) => block.children.map((c: any) => c.text).join(""))
        .join(" ")
    : undefined,
  image: getImageUrl(tour.mainImage)
    ? [getImageUrl(tour.mainImage)]
    : ["https://fincaguarumo.com/images/finca-guarumo-v4.4.jpg"],
  inLanguage: "en",
  isPartOf: {
    "@type": "TouristDestination",
    name: "Osa Peninsula",
    description: "Costa Rica's most biodiverse region",
    url: "https://fincaguarumo.com",
  },
})

const Page = async ({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) => {
  const { slug, locale } = await params

  const tour = await sanityFetch<TTour>({
    query: TOUR_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })
  const dialog = await sanityFetch<IDialog>({
    query: DIALOG_QUERY,
    revalidate: 0,
  })
  tour.dialog = dialog

  if (!tour || !tour.isPublished) {
    return null // handled by TourPage
  }

  return (
    <>
      <TourPage tour={tour} locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(tourJsonLd(tour)).replace(/</g, "\\u003c"),
        }}
      />
    </>
  )
}

export default Page