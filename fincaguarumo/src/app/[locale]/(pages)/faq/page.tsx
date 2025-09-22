import React from "react"
import { sanityFetch } from "@/sanity/lib/client"
import { FAQ_QUERY } from "@/sanity/lib/queries"
import NotFound from "../../not-found"
import { FAQType } from "@/types"
import FAQCategories from "@/components/FAQ"
import { loadTranslations } from "@/lib/utils"

const FAQpage = async ({ params }: { params: any }) => {
  const { locale } = await params
  const messages = await loadTranslations(locale)
  const faqs: FAQType[] = await sanityFetch({
    query: FAQ_QUERY,
    params: { language: locale },
    revalidate: 0,
  })
  if (!faqs) return NotFound()

  console.log({ faqs })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {messages.faq?.title ?? "Frequently Asked Questions"}
      </h1>
      <FAQCategories faqs={faqs} />
    </div>
  )
}

export default FAQpage
