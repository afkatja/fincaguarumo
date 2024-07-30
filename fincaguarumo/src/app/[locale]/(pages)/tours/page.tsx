import React from "react"
import Layout from "../PageLayout"
import Tour from "./tour"
import tours from "./data"

const Tours = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  const part1 = tours.slice(0, tours.length / 3)
  const part2 = tours.slice(tours.length / 3, (tours.length / 3) * 2)
  const part3 = tours.slice((tours.length / 3) * 2, tours.length)

  return (
    <Layout locale={locale} pageName="tours">
      <div className="overflow-y-hidden columns">
        <div className="column column-reverse">
          {part1.map(tour => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
        <div className="column">
          {part2.map(tour => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
        <div className="column column-reverse">
          {part3.map(tour => {
            return <Tour key={crypto.randomUUID()} {...tour} />
          })}
        </div>
      </div>
    </Layout>
  )
}

export default Tours
