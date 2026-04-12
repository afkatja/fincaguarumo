import { notFound } from "next/navigation"
import { Metadata } from "next"

import { sanityFetch } from "@/sanity/lib/client"
import { PAGES_QUERY } from "@/sanity/lib/queries"
import Layout from "../pagesLayout"
import ClientPage from "./ClientPage"
import { FAQType, SanityImageObject } from "@/types"

const jsonLd = (data: {
  title: string
  slug: { current: string }
  description?: string
  locale: string
}) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${data.title} - Finca Guarumo`,
  description:
    data.description ||
    "Learn about Finca Guarumo and our sustainable eco-tourism initiatives in Costa Rica's Osa Peninsula",
  url: `https://fincaguarumo.com/${data.slug.current}`,
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

  const baseUrl = "https://fincaguarumo.com"
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${locale}/${slug}`

  const title = content?.title
    ? `${content?.title} - Finca Guarumo`
    : "Finca Guarumo"

  const description = content?.description
    ? content?.description
    : "Off-grid eco-villa in Costa Rica's Osa Peninsula with 100% solar power and wildlife viewing"

  // Enhanced keywords for stay/accommodation pages
  const keywords =
    slug === "villa-bruno"
      ? `eco-villa, sustainable accommodation, Costa Rica, Osa Peninsula, Villa Bruno, eco-luxury, solar power, off-grid, wildlife viewing, Corcovado National Park, Puerto Jimenez, jungle retreat, nature vacation, sustainable travel, eco-tourism, birdwatching, rainforest accommodation, luxury villa, private villa, romantic getaway, nature immersion, regenerative tourism, solar powered villa, eco-lodge Costa Rica, sustainable hospitality, green travel, carbon neutral accommodation, wildlife sanctuary, biodiversity hotspot, pristine nature, exclusive retreat, eco-friendly lodging`
          .split(",")
          .map(k => k.trim())
          .filter(Boolean)
      : `finca guarumo, costa rica, osa peninsula, eco-tourism, sustainable travel, nature, wildlife, birdwatching, jungle, corcovado national park, puerto jimenez, eco-lodge, sustainable hospitality`
          .split(",")
          .map(k => k.trim())
          .filter(Boolean)

  return {
    title,
    description,
    keywords,
    metadataBase: new URL(baseUrl),
    robots: "index, follow",
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": `${baseUrl}/${slug}`,
        ...Object.fromEntries(
          ["en", "es", "ru", "de", "nl"].map(loc => [
            loc,
            loc === "en" ? `${baseUrl}/${slug}` : `${baseUrl}/${loc}/${slug}`,
          ]),
        ),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: `${content?.title || "Finca Guarumo"} - Eco-Villa in Costa Rica`,
        },
      ],
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
      <script type="application/ld+json">
        {JSON.stringify(
          jsonLd({
            title: content?.title,
            slug: content?.slug,
            description: content?.description,
            locale,
          }),
        ).replace(/</g, "\\u003c")}
      </script>
    </Layout>
  )
}

export default Page
