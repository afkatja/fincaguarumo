import React from "react"
import Layout from "../PageLayout"
import Tour from "./tour"
import tours from "./data"

const Tours = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  return (
    <Layout locale={locale} pageName="tours">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12 py-5">
        {tours.map(tour => {
          return <Tour key={crypto.randomUUID()} {...tour} />
        })}
      </div>
    </Layout>
  )
}

export default Tours
