import React from "react"
import Layout from "../PageLayout"
// import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import { sanityFetch } from "../../../../sanity/lib/client"
import { ABOUT_QUERY } from "../../../../sanity/lib/queries"
import { PortableText } from "next-sanity"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"

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
  })

  return (
    <Layout
      locale={locale}
      pageName="about"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      <PortableText value={content?.body} />
      {/* {t.rich("body", {
          p: chunks => <p key={crypto.randomUUID()}>{chunks}</p>,
        })} */}
    </Layout>
  )
}

export default About
