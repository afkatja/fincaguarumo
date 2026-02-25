import { sanityFetch } from "@/sanity/lib/client"
import { FAQ_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import NotFound from "../../not-found"
import { FAQType } from "@/types"
import FAQCategories from "@/components/FAQ"
import { getTranslations } from "next-intl/server"

const jsonLd = (faqs: FAQType[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
    keywords: faq.keywords?.join(", "),
  })),
})

const FAQpage = async ({ params }: { params: any }) => {
  const { locale } = await params
  const messages = await getTranslations(locale)
  const faqs: FAQType[] = await sanityFetch({
    query: FAQ_QUERY,
    params: { language: locale },
    revalidate: 0,
  })
  if (!faqs) return NotFound()

  return (
    <Layout
      locale={locale}
      pageName="FAQ"
      title={messages("faq.title") ?? "Frequently Asked Questions"}
    >
      <div className="w-11/12 mx-auto py-8">
        <FAQCategories faqs={faqs} />
      </div>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd(faqs)).replace(/</g, "\\u003c")}
      </script>
    </Layout>
  )
}

export default FAQpage
