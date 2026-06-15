import Layout from "../pagesLayout"
import { getTranslations } from "next-intl/server"
import ClientPage from "./ClientPage"
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Guest Reviews and Testimonials for Villa Bruno at Finca Guarumo",
  description:
    "Read all reviews from guests who have stayed at Villa Bruno in Costa Rica.",
  url: "https://fincaguarumo.com/reviews",

  about: {
    "@type": "LodgingBusiness",
    "@id": "https://fincaguarumo.com/villa-bruno#about",
    name: "Villa Bruno at Finca Guarumo",
  },

  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 5,
    reviewCount: 25,
    bestRating: 5,
    worstRating: 4,
  },
}

const page = async ({ params }: { params: any }) => {
  const { locale } = await params
  const t = await getTranslations("reviews")

  return (
    <Layout locale={locale} pageName="Reviews" title={t("title")}>
      <ClientPage />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
      </script>
    </Layout>
  )
}

export default page
