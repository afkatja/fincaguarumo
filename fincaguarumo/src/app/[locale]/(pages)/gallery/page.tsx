import { Metadata } from "next"
import { sanityFetch } from "../../../../sanity/lib/client"
import { GALLERY_QUERY, PAGE_QUERY } from "../../../../sanity/lib/queries"
import Layout from "../pagesLayout"
import Carousel from "@/components/Carousel"
import {
  normalizeToCarouselImages,
  type GalleryImage,
  type ImageWithMetadata,
} from "@/lib/sanityImages"
import { getLocalizedUrl, hasTranslation } from "@/lib/url"
import { getTranslations } from "next-intl/server"
import { localeMap } from "@/lib/schema/lodgingBusiness"

function getImageUrl(image: ImageWithMetadata | null | undefined): string {
  if (!image) return ""
  return (image as any).url || ""
}

type Content = {
  title: string
  description: string
  mainImage?: ImageWithMetadata | null
  language: string
  translations?: Array<{ language: string; slug?: { current: string } }>
}

type GalleryResult = {
  title: string
  images: GalleryImage[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const content: Content = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "gallery" },
  })

  // Return noindex for untranslated locales (non-English without Sanity translation)
  if (!hasTranslation(content?.translations, locale)) {
    return {
      robots: "noindex, nofollow",
    }
  }

  const t = await getTranslations("gallery")
  const title = t("title", { defaultValue: "Gallery" })

  const canonicalUrl = getLocalizedUrl("/gallery", locale)

  return {
    title,
    description: content?.description || "Gallery - Finca Guarumo",
    metadataBase: new URL("https://fincaguarumo.com"),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": getLocalizedUrl("/gallery", "en"),
        [locale]: canonicalUrl,
      },
    },
    openGraph: {
      title,
      description: content?.description || "Gallery - Finca Guarumo",
      url: canonicalUrl,
      siteName: "Finca Guarumo",
      type: "website",
      locale: localeMap[locale] || "en_US",
      images: [
        {
          url: getImageUrl(content?.mainImage) || "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo - Gallery",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: content?.description || "Gallery - Finca Guarumo",
      images: [getImageUrl(content?.mainImage) || "/images/finca-guarumo-v4.4.jpg"],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}

const GalleryPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  const content: Content = await sanityFetch({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { language: locale, pageName: "gallery" },
  })

  const gallery: GalleryResult = await sanityFetch({
    query: GALLERY_QUERY,
    revalidate: 0,
    params: { category: "General" },
  })

  const images = normalizeToCarouselImages(gallery?.images)
  return (
    <Layout
      locale={locale}
      pageName="gallery"
      title={content?.title}
      description={content?.description}
    >
      <Carousel
        useArrows={false}
        images={images}
        options={{ loop: true }}
        className="bg-transparent py-5 lg:py-8 overflow-hidden"
      />
    </Layout>
  )
}

export default GalleryPage
