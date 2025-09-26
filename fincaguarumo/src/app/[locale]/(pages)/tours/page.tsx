import React from "react"
import { SanityDocument } from "next-sanity"
import { Metadata } from "next"
import { PAGE_QUERY, TOURS_QUERY } from "../../../../sanity/lib/queries"
import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { TourType } from "./TourItem"

// Generate metadata for the tours page
export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale } = await params
  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    params: { pageName: "tours", language: locale },
    revalidate: 0,
  })

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl = `${baseUrl}/${locale}/tours`

  return {
    title: pageContent?.title || "Tours - Finca Guarumo",
    description:
      pageContent?.description ||
      "Explore our guided tours and wildlife experiences at Finca Guarumo in Costa Rica.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/en/tours`,
        es: `${baseUrl}/es/tours`,
        ru: `${baseUrl}/ru/tours`,
        nl: `${baseUrl}/nl/tours`,
        de: `${baseUrl}/de/tours`,
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

const Tours = async ({ params }: { params: any }) => {
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

  const headerImage =
    toursContent[Math.floor(Math.random() * toursContent.length)].mainImage

  return (
    <Layout
      locale={locale}
      pageName="tours"
      title={pageContent?.title}
      description={pageContent?.description}
      mainImage={headerImage}
    >
      <ClientPage tours={toursContent} locale={locale} />
    </Layout>
  )
}

export default Tours
