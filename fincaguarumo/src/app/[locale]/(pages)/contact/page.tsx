import { Metadata } from "next"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PAGE_QUERY_RESULT } from "../../../../../sanity.types"

import ContactPage from "./ContactPage"
import { getLocalizedUrl, hasTranslation } from "@/lib/url"
import { getTranslations } from "next-intl/server"
import { localeMap } from "@/lib/schema/lodgingBusiness"

type PageContentWithTranslations = PAGE_QUERY_RESULT & {
  translations?: Array<{ language: string; slug?: { current: string } }>
}

const schema = {
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  name: "Villa Bruno at Finca Guarumo Eco-Lodge",
  description:
    "Sustainable eco-lodge in the Osa Peninsula offering wildlife viewing and rainforest experiences",
  geo: {
    "@type": "GeoCoordinates",
    latitude: "8.496420632614996",
    longitude: "-83.3341457939961",
  },
  touristType: [
    "Eco-tourists",
    "Nature photographers",
    "Birdwatchers",
    "Wildlife enthusiasts",
    "Sustainable travelers",
  ],
  includesAttraction: [
    {
      "@type": "TouristAttraction",
      name: "Corcovado National Park",
      description: "One of the most biodiverse places on Earth",
    },
    {
      "@type": "TouristAttraction",
      name: "Scarlet Macaw Viewing",
      description: "Daily sightings of endangered scarlet macaws",
    },
  ],
}

const people = [
  {
    name: "Peter",
    avatar: "/images/peter.jpg",
    email: "info@fincaguarumo.com",
    phoneNumber: "+50687729995",
  },
  {
    name: "Katia",
    avatar: "/images/katia.jpeg",
    phoneNumber: "+50687495341",
    email: "info@fincaguarumo.com",
  },
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const content = await sanityFetch<PageContentWithTranslations>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { pageName: "contact", language: locale },
  })

  // Return noindex for untranslated locales (non-English without Sanity translation)
  if (!hasTranslation(content?.translations, locale)) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const t = await getTranslations("contact")
  const title = t("title", { defaultValue: "Contact Finca Guarumo" })

  const canonicalUrl = getLocalizedUrl("/contact", locale)

  return {
    title,
    description: content?.description || "Contact Finca Guarumo - Get in touch with us",
    metadataBase: new URL("https://fincaguarumo.com"),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": getLocalizedUrl("/contact", "en"),
        [locale]: canonicalUrl,
      },
    },
    openGraph: {
      title,
      description: content?.description || "Contact Finca Guarumo",
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      locale: localeMap[locale] || "en_US",
      images: [
        {
          url: content?.mainImage?.url || "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo - Contact",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: content?.description || "Contact Finca Guarumo",
      images: [content?.mainImage?.url || "/images/finca-guarumo-v4.4.jpg"],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

const Contact = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  const content = await sanityFetch<PAGE_QUERY_RESULT>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { pageName: "contact", language: locale },
  })

  return (
    <>
      <ContactPage locale={locale} content={content} people={people} />
      <script type="application/ld+json">
        {JSON.stringify(schema).replace(/</g, "\\u003c")}
      </script>
    </>
  )
}

export default Contact
