import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { ABOUT_QUERY } from "../../../../sanity/lib/queries"
import type { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"
import RichText from "../../../../components/RichText"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
}
const About = async ({ params }: { params: any }) => {
  const { locale } = await params
  const content: Content = await sanityFetch({
    query: ABOUT_QUERY,
    params: { language: locale },
  })

  return (
    <Layout
      locale={locale}
      pageName="about"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      <RichText body={content?.body} />
    </Layout>
  )
}

export default About
