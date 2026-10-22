import { Metadata } from "next"
import { sanityFetch } from "@/sanity/lib/client"
import { TOUR_QUERY } from "@/sanity/lib/queries"
import { getLocalizedUrl } from "@/lib/url"

const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

interface TourData {
  title?: string
  description?: string
  slug?: { current: string }
  isPublished?: boolean
  price?: number
  duration?: string
  mainImage?: {
    url?: string
    alt?: string
  }
  translations?: Array<{
    language: string
    slug: { current: string }
    title: string
    description: string
  }>
}

export async function generateTourMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params

  const tour: TourData = await sanityFetch({
    query: TOUR_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!tour?.isPublished) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const canonicalUrl = getLocalizedUrl(`/tours/${slug}`, locale)

  const title = tour?.title
    ? `${tour.title} - Finca Guarumo Tours`
    : "Finca Guarumo Tours"

  const description =
    tour?.description ||
    "Discover guided tours at Finca Guarumo in Costa Rica's Osa Peninsula. Experience wildlife, birdwatching, and sustainable eco-tourism."

  // Build hreflang alternates only for locales with actual translations
  const languages: Record<string, string> = {
    "x-default": getLocalizedUrl(`/tours/${slug}`, "en"),
    [locale]: canonicalUrl,
  }

  if (tour.translations) {
    for (const t of tour.translations) {
      if (t.language && t.language !== locale && t.slug?.current) {
        languages[t.language] = getLocalizedUrl(`/tours/${t.slug.current}`, t.language)
      }
    }
  }

  const ogImageUrl = tour.mainImage?.url
    ? tour.mainImage.url
    : "/images/finca-guarumo-v4.4.jpg"
  const ogImageAlt = tour.mainImage?.alt
    ? tour.mainImage.alt
    : tour.title || "Finca Guarumo Tours"

  return {
    title,
    description,
    metadataBase: new URL("https://fincaguarumo.com"),
    robots: "index, follow",
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
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}