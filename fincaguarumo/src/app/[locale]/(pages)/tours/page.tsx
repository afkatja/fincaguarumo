import React from "react"
import { SanityDocument } from "next-sanity"
import Layout from "../PageLayout"
import Tour, { TourType } from "./TourItem"
import { TOURS_QUERY } from "../../../../sanity/lib/queries"
import { sanityFetch } from "../../../../sanity/lib/client"

const Tours = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const tours = await sanityFetch<SanityDocument>({
    query: TOURS_QUERY,
    revalidate: 0,
  })

  const part1 = tours.slice(0, tours.length / 3)
  const part2 = tours.slice(tours.length / 3, (tours.length / 3) * 2)
  const part3 = tours.slice((tours.length / 3) * 2, tours.length)

  return (
    <Layout locale={locale} pageName="tours">
      <div className="overflow-y-hidden columns">
        <div className="column column-reverse">
          {part1.map((tour: TourType) => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
        <div className="column">
          {part2.map((tour: TourType) => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
        <div className="column column-reverse">
          {part3.map((tour: TourType) => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
      </div>
    </Layout>
  )
}

export default Tours
