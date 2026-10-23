import { Metadata } from "next"
import { sanityFetch } from "@/sanity/lib/client"
import { FAQ_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import NotFound from "../../not-found"
import { FAQType } from "@/types"
import FAQCategories from "@/components/FAQ"
import { getTranslations } from "next-intl/server"
import { portableTextToPlain } from "@/sanity/lib/portableTextHelper"
import { getLocalizedUrl } from "@/lib/url"

const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

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
  displayOrder: "alphabetical",
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const faqs: FAQType[] = await sanityFetch({
    query: FAQ_QUERY,
    params: { language: locale },
    revalidate: 3600,
  })

  if (!faqs || faqs.length === 0) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const t = await getTranslations("faq")
  const title = t("title", { defaultValue: "Frequently Asked Questions" })

  const canonicalUrl = getLocalizedUrl("/faq", locale)

  const description =
    "Find answers to common questions about Villa Bruno, tours, sustainability, booking, and staying at Finca Guarumo in Costa Rica's Osa Peninsula."

  return {
    title,
    description,
    metadataBase: new URL("https://fincaguarumo.com"),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": getLocalizedUrl("/faq", "en"),
        [locale]: canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      locale: localeMap[locale] || "en_US",
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo FAQ",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/finca-guarumo-v4.4.jpg"],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

const FAQpage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  const faqs: FAQType[] = await sanityFetch({
    query: FAQ_QUERY,
    params: { language: locale },
    revalidate: 3600,
  })
  const t = await getTranslations("faq")
  if (!faqs) return NotFound()

  return (
    <>
      <Layout
        locale={locale}
        pageName="FAQ"
        title={t("title", { defaultValue: "Frequently Asked Questions" })}
      >
        <div className="w-11/12 mx-auto py-8">
          <FAQCategories faqs={faqs} />
        </div>
      </Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd(faqs, faqs[0]?.lastModified)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
    </>
  )
}

export default FAQpage
