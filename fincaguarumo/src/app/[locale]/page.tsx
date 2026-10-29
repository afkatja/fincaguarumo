import { Metadata } from "next"
import { sanityFetch } from "../../sanity/lib/client"
import { HOME_QUERY } from "../../sanity/lib/queries"
import { HomeContent } from "../../types"
import HomePage from "./HomePage"
import {
  buildLodgingBusinessSchema,
  buildWebSiteSchema,
  localeMap,
  gbpUrl,
  airbnbUrl,
  staticKnowsAbout,
  staticSameAs,
} from "@/lib/schema/lodgingBusiness"
import { orgSchema } from "@/lib/villa-json-ld"
import { getLocalizedUrl } from "@/lib/url"

const baseUrl = "https://fincaguarumo.com"

const homePageSchema = buildLodgingBusinessSchema({
  name: "Villa Bruno - Finca Guarumo",
  identifier: "villa-bruno-finca-guarumo",
  alternateName: ["Finca Guarumo Villa Bruno"],
  description:
    "Off-grid eco-villa in Costa Rica's Osa Peninsula near Corcovado National Park with 100% solar power, wildlife viewing, and sustainable luxury accommodation",
  url: `${baseUrl}/villa-bruno`,
  floorSizeValue: 56,
  occupancyMax: 4,
  reviewCount: 36,
  starRating: "5",
  price: 117.0,
  priceCurrency: "USD",
  checkinTime: "2026-11-01T15:00:00+00:00",
  checkoutTime: "2026-11-01T11:00:00+00:00",
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
  knowsAbout: staticKnowsAbout,
  sameAs: staticSameAs,
  hasMap: gbpUrl,
})

const jsonLd = (data: { locale: string }) => ({
  "@context": "https://schema.org",
  "@graph": [buildWebSiteSchema(data.locale), homePageSchema, orgSchema],
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

  if (locale !== "en") {
    return {
      robots: "noindex, nofollow",
      alternates: {
        canonical: baseUrl,
      },
    }
  }

  const title = content?.hero_title
    ? `${content.hero_title} - Finca Guarumo`
    : "Finca Guarumo"

  const description =
    content?.hero_slogan ||
    "Stay at Villa Bruno in Finca Guarumo – a private eco-luxury villa in Costa Rica's Osa Peninsula. Explore jungle trails, birdwatching, and rural life near Corcovado National Park."

  const canonicalUrl = getLocalizedUrl("/", locale)
  const xDefaultUrl = getLocalizedUrl("/", "en")

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
        "x-default": xDefaultUrl,
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
