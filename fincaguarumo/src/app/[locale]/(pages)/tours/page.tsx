import React from "react"
import Layout from "../pageLayout"

const Tours = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  return (
    <Layout locale={locale} pageName="tours">
      <div>Tours</div>
    </Layout>
  )
}

export default Tours
