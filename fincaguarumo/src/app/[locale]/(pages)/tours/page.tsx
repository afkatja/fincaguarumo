import React from "react"
import { SanityDocument } from "next-sanity"
import { Metadata } from "next"
import { PAGE_QUERY, TOURS_QUERY } from "../../../../sanity/lib/queries"
import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { TourType } from "./TourItem"
import { getLocalizedUrl } from "@/lib/url"

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

  return (
    <Layout
      locale={locale}
      pageName="tours"
      title={pageContent?.title}
      description={pageContent?.description}
      mainImage={headerImage}
    >
      <ClientPage tours={tours} locale={locale} />
    </Layout>
  )
}

export default Tours
