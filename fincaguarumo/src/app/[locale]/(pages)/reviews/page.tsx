import { Metadata } from "next"
import Layout from "../pagesLayout"
import { getTranslations } from "next-intl/server"
import ClientPage from "./ClientPage"
import { getLocalizedUrl } from "@/lib/url"
import { localeMap } from "@/lib/schema/lodgingBusiness"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Guest Reviews and Testimonials for Villa Bruno at Finca Guarumo",
  description:
    "Read all reviews from guests who have stayed at Villa Bruno at Finca Guarumo in Costa Rica.",
  url: "https://fincaguarumo.com/reviews",

  about: {
    "@type": "LodgingBusiness",
    "@id": "https://fincaguarumo.com/villa-bruno#about",
    name: "Villa Bruno at Finca Guarumo",
  },

  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 5,
    reviewCount: 36,
    bestRating: 5,
    worstRating: 4,
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  // Reviews page doesn't have Sanity translations - only English content
  // Return noindex for non-English locales
  if (locale !== "en") {
    return {
      robots: "noindex, nofollow",
    }
  }

  const t = await getTranslations("reviews")
  const title = t("title")

  const canonicalUrl = getLocalizedUrl("/reviews", locale)

  return {
    title,
    description: "Read all reviews from guests who have stayed at Villa Bruno at Finca Guarumo in Costa Rica.",
    metadataBase: new URL("https://fincaguarumo.com"),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": canonicalUrl,
        [locale]: canonicalUrl,
      },
    },
    openGraph: {
      title,
      description: "Read all reviews from guests who have stayed at Villa Bruno at Finca Guarumo in Costa Rica.",
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      locale: localeMap[locale] || "en_US",
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo - Reviews",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Read all reviews from guests who have stayed at Villa Bruno at Finca Guarumo in Costa Rica.",
      images: ["/images/finca-guarumo-v4.4.jpg"],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

const page = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  const t = await getTranslations("reviews")

  return (
    <Layout locale={locale} pageName="Reviews" title={t("title")}>
      <ClientPage />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
      </script>
    </Layout>
  )
}

export default page
