import React from "react"
import Layout from "../pagesLayout"
import { getTranslations } from "next-intl/server"
import ClientPage from "./ClientPage"
import Script from "next/script"
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Guest Reviews and Testimonials for Villa Bruno - Finca Guarumo",
  description:
    "Read all reviews from guests who have stayed at Villa Bruno in Costa Rica.",
  url: "https://fincaguarumo.com/reviews",

  about: {
    "@type": "LodgingBusiness", // Use the type that fixed your main page error
    "@id": "https://fincaguarumo.com/stay#unit", // Use the same @id as the main page
    name: "Villa Bruno - Finca Guarumo",
  },

  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 5,
    reviewCount: 11,
    bestRating: 5,
    worstRating: 1,
  },
}

const page = async ({ params }: { params: any }) => {
  const { locale } = await params
  const messages = await getTranslations()

  return (
    <Layout
      locale={locale}
      pageName="Reviews"
      title={messages("reviews.title") ?? "Reviews"}
    >
      <ClientPage />
      <Script
        id="json-ld-reviews-page"
        strategy="afterInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </Layout>
  )
}

export default page
