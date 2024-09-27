import React from "react"
import { sanityFetch } from "../../../../sanity/lib/client"
import { ABOUT_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import Layout from "../pagesLayout"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
}
const About = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
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
      icon="MacawFly"
    >
      <PortableText value={content?.body} />
    </Layout>
  )
}

export default About
