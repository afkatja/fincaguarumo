import { notFound } from "next/navigation"
import { Metadata } from "next"

import { sanityFetch } from "@/sanity/lib/client"
import { PAGES_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { FAQType, SanityImageObject } from "@/types"

function getImageUrl(image: SanityImageObject | undefined): string {
  if (!image) return ""
  // SanityImageSource has url property
  return (image as any).url || ""
}

function getImageAlt(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as any).alt || ""
}

const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

const jsonLd = (data: {
  title: string
  slug: { current: string }
  description?: string
  locale: string
  url: string
}) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${data.title} - Finca Guarumo`,
  description:
    data.description ||
    "Learn about Finca Guarumo and our sustainable eco-tourism initiatives in Costa Rica's Osa Peninsula",
  url: data.url,
  about: {
    "@type": "Thing",
    name: "Eco-Tourism",
    description: "Sustainable tourism and nature conservation in Costa Rica",
  },
  inLanguage: data.locale,
  isPartOf: {
    "@type": "WebSite",
    name: "Finca Guarumo",
    url: "https://fincaguarumo.com",
  },
})

export type Content = {
  title: string
  subtitle?: string
  description: string
  locale?: string
  mainImage: SanityImageObject
  body: any
  slug: { current: string }
  isPublished: boolean
  showBookingOptions: boolean
  showBookingDialog: boolean
  showFAQ: boolean
  slideshow: {
    images: SanityImageObject[]
  }
  price?: number
  categories?: { title: string }[]
  faq?: FAQType[]
  translations?: Array<{
    language: string
    slug: { current: string }
    title: string
    description: string
  }>
}

export async function generateMetadata({
  params,
}: {
  params: any
}): Promise<Metadata> {
  const { locale, slug } = await params

  const content: Content = await sanityFetch({
    query: PAGES_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!content?.isPublished) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${locale}/${slug}`

  const title = content?.title
    ? `${content?.title} - Finca Guarumo`
    : "Finca Guarumo"

  const description = content?.description
    ? content?.description
    : "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing"

  // Build hreflang alternates only for locales with actual translations
  const languages: Record<string, string> = {
    "x-default": canonicalUrl,
    [locale]: canonicalUrl,
  }

  if (content.translations) {
    for (const t of content.translations) {
      if (t.language && t.language !== locale && t.slug?.current) {
        const altUrl =
          t.language === "en"
            ? `${baseUrl}/${t.slug.current}`
            : `${baseUrl}/${t.language}/${t.slug.current}`
        languages[t.language] = altUrl
      }
    }
  }

  // Use page-specific image if available, fallback to default
  const ogImageUrl = getImageUrl(content?.mainImage)
    ? getImageUrl(content.mainImage)
    : "/images/finca-guarumo-v4.4.jpg"
  const ogImageAlt = getImageAlt(content?.mainImage)
    ? getImageAlt(content.mainImage)
    : `${content?.title || "Finca Guarumo"} - Eco-Villa in Costa Rica`

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    alternates: {
      canonical: canonicalUrl,
      languages,
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
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@fincaguarumo",
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: ogImageAlt,
        },
      ],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

const Page = async ({ params }: { params: any }) => {
  const { locale, slug } = await params

  const content: Content = await sanityFetch({
    query: PAGES_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  if (!content?.isPublished) notFound()

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${locale}/${slug}`

  return (
    <Layout
      locale={locale}
      pageName={slug}
      title={content?.title}
      subtitle={content?.subtitle}
      description={content?.description}
      mainImage={content?.mainImage}
      images={content?.slideshow?.images}
    >
      <ClientPage content={content} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLd({
              title: content?.title,
              slug: content?.slug,
              description: content?.description,
              locale,
              url: canonicalUrl,
            }),
          ).replace(/</g, "\\u003c"),
        }}
      />
    </Layout>
  )
}

export default Page