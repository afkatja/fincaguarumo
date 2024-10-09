import React from "react"
import { SanityDocument } from "next-sanity"
import Tour, { TourType } from "./TourItem"
import { PAGE_QUERY, TOURS_QUERY } from "../../../../sanity/lib/queries"
import { sanityFetch } from "../../../../sanity/lib/client"
import Layout from "../pagesLayout"

const Tours = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const tours = await sanityFetch<SanityDocument>({
    query: TOURS_QUERY,
    revalidate: 0,
    params: { language: locale },
  })

  const pageContent = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    params: { pageName: "tours", language: locale },
    revalidate: 0,
  })

  const part1 = tours.slice(0, tours.length / 3)
  const part2 = tours.slice(tours.length / 3, (tours.length / 3) * 2)
  const part3 = tours.slice((tours.length / 3) * 2, tours.length)

  const headerImage = tours[Math.floor(Math.random() * tours.length)].images
    ? tours[Math.floor(Math.random() * tours.length)].images[0]
    : tours[Math.floor(Math.random() * tours.length)].mainImage
  return (
    <Layout
      locale={locale}
      pageName="tours"
      title={pageContent?.title}
      description={pageContent?.description}
      mainImage={headerImage}
    >
      <div className="overflow-y-hidden columns grid gap-5 grid-cols-1 md:grid-cols-3 items-start mx-auto relative">
        <div className="column column-reverse flex flex-col md:py-2">
          {part1.map((tour: TourType) => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
        <div className="column flex flex-col md:py-2">
          {part2.map((tour: TourType) => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
        <div className="column column-reverse flex flex-col md:py-2">
          {part3.map((tour: TourType) => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
      </div>
    </Layout>
  )
}

export default Tours
