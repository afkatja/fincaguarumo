import { sanityFetch } from "@/sanity/lib/client"
import { FAQ_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import NotFound from "../../not-found"
import { FAQType } from "@/types"
import FAQCategories from "@/components/FAQ"
import { getTranslations } from "next-intl/server"
import { portableTextToPlain } from "@/sanity/lib/portableTextHelper"

const getFAQAnswerText = (faq: FAQType) =>
  faq.answerBlockContent?.length
    ? portableTextToPlain(faq.answerBlockContent)
    : (faq.answer ?? "")

const jsonLd = (faqs: FAQType[], lastModified?: string) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  dateModified: lastModified ?? new Date().toISOString().split("T")[0],
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: getFAQAnswerText(faq),
    },
  })),
})

const FAQpage = async ({ params }: { params: any }) => {
  const { locale } = await params
  const faqs: FAQType[] = await sanityFetch({
    query: FAQ_QUERY,
    params: { language: locale },
    revalidate: 3600,
  })
  const t = await getTranslations("faq")
  if (!faqs) return NotFound()

  return (
    <Layout
      locale={locale}
      pageName="FAQ"
      title={t("title", { defaultValue: "Frequently Asked Questions" })}
    >
      <div className="w-11/12 mx-auto py-8">
        <FAQCategories faqs={faqs} />
      </div>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd(faqs, faqs[0]?.lastModified)).replace(
          /</g,
          "\\u003c",
        )}
      </script>
    </Layout>
  )
}

export default FAQpage
