import { sanityFetch } from "../../../../sanity/lib/client"
import { ABOUT_QUERY } from "../../../../sanity/lib/queries"
import Layout from "../pagesLayout"
import RichText from "../../../../components/RichText"
import { SanityImageObject } from "../../../../types"
import {
  staticAddress,
  staticGeo,
  staticKnowsAbout,
  staticSameAs,
} from "../../../../lib/schema/lodgingBusiness"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Villa Bruno at Finca Guarumo",
  alternateName: "Villa Bruno at Finca Guarumo, Eco-Lodge",
  description:
    "Sustainable eco-lodge in Costa Rica's Osa Peninsula offering off-grid luxury accommodation, wildlife tours, and farm-to-table experiences near Corcovado National Park.",
  url: "https://fincaguarumo.com",
  logo: "https://fincaguarumo.com/logo.png",
  foundingDate: "2023",
  owner: {
    "@type": "Person",
    name: "Katia Hollaar",
  },
  alternateOwner: {
    "@type": "Person",
    name: "Peter Hollaar",
  },
  address: staticAddress,
  geo: staticGeo,
  telephone: "+506-87495341",
  email: "info@fincaguarumo.com",
  sameAs: staticSameAs,
  sustainability:
    "We harness 100% of our electricity from solar energy. Our water comes straight from a crystal-clear spring, free from chemicals and rich in minerals. We're committed to growing at least 70% of what we eat, composting organic waste, and using rainwater for non-drinking purposes. Our ongoing reforestation efforts focus on planting fruit and native forest trees, enhancing the local ecosystem.",
  knowsAbout: staticKnowsAbout,
  areaServed: {
    "@type": "GeoCircle",
    geoMidpoint: staticGeo,
    geoRadius: 50,
  },
}

const About = async ({ params }: { params: any }) => {
  const { locale } = await params
  const content: Content = await sanityFetch({
    query: ABOUT_QUERY,
    params: { language: locale },
  })

  return (
    <>
      <Layout
        locale={locale}
        pageName="about"
        title={content?.title}
        description={content?.description}
        mainImage={content?.mainImage}
      >
        <RichText body={content?.body} />
      </Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  )
}

export default About
