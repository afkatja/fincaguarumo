import React from "react"
import { SanityDocument } from "next-sanity"
import { Metadata } from "next"
import Tour, { TourType } from "./TourItem"
import { PAGE_QUERY, TOURS_QUERY } from "../../../../sanity/lib/queries"
import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"

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
  const toursContent = await sanityFetch<SanityDocument>({
    query: TOURS_QUERY,
    revalidate: 0,
    params: { language: locale },
  })

  const tours = toursContent
    .filter((tour: TourType) => tour.isPublished)
    .map((tour: Omit<TourType, "href">) => ({
      href: `/${locale}/tours/${tour.slug.current}`,
      ...tour,
    }))

  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    params: { pageName: "tours", language: locale },
    revalidate: 0,
  })

  const part1 = tours.slice(0, tours.length / 3)
  const part2 = tours.slice(tours.length / 3, (tours.length / 3) * 2)
  const part3 = tours.slice((tours.length / 3) * 2, tours.length)

  const headerImage = tours[Math.floor(Math.random() * tours.length)].mainImage

  return (
    <Layout
      locale={locale}
      pageName="tours"
      title={pageContent?.title}
      description={pageContent?.description}
      mainImage={headerImage}
    >
      <div className="overflow-y-hidden columns grid gap-5 grid-cols-1 md:grid-cols-3 items-start w-11/12 mx-auto relative">
        {!!part1.length && (
          <div className="column column-reverse flex flex-col md:py-2">
            {part1.map((tour: TourType) => {
              return (
                <Tour
                  key={`tour-${tour.slug.current}`}
                  {...tour}
                  locale={locale}
                />
              )
            })}
          </div>
        )}
        {!!part2.length && (
          <div className="column flex flex-col md:py-2">
            {part2.map((tour: TourType) => {
              return (
                <Tour
                  key={`tour-${tour.slug.current}`}
                  {...tour}
                  locale={locale}
                />
              )
            })}
          </div>
        )}
        {!!part3.length && (
          <div className="column column-reverse flex flex-col md:py-2">
            {part3.map((tour: TourType) => {
              return (
                <Tour
                  key={`tour-${tour.slug.current}`}
                  {...tour}
                  locale={locale}
                />
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Tours
