import { sanityFetch } from "../../../../sanity/lib/client"
import { GALLERY_QUERY, PAGE_QUERY } from "../../../../sanity/lib/queries"
import Layout from "../pagesLayout"
import Carousel from "@/components/Carousel"
import {
  normalizeToCarouselImages,
  type GalleryImage,
  type ImageWithMetadata,
} from "@/lib/sanityImages"

type Content = {
  title: string
  description: string
  mainImage?: ImageWithMetadata | null
}

type GalleryResult = {
  title: string
  images: GalleryImage[]
}

const GalleryPage = async ({ params }: { params: any }) => {
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
