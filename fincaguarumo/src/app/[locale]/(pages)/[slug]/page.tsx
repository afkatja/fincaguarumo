import React from "react"
import { notFound } from "next/navigation"
import { SanityImageObject } from "@sanity/image-url/lib/types/types"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGES_QUERY } from "../../../../sanity/lib/queries"
import Layout from "../pagesLayout"
import RichText from "@/components/RichText"
import { BookingOptions } from "@/components/BookingOptions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog"

type Content = {
  title: string
  description: string
  mainImage: SanityImageObject
  body: any
  slug: { current: string }
  isPublished: boolean
  showBookingOptions: boolean
  slideshow: {
    images: SanityImageObject[]
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
      description={content?.description}
      mainImage={content?.mainImage}
      images={content?.slideshow?.images}
    >
      <RichText body={content?.body} />
      {content?.showBookingOptions && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center sticky bottom-4 mb-2 mx-auto w-11/12">
              <Button size="lg" variant="secondary" className="ml-auto">
                Book now
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>Book Your Stay</DialogTitle>
            <div className="mt-8">
              <BookingOptions
                propertyId="your-booking-property-id"
                expediaPropertyId={
                  process.env.NEXT_PUBLIC_EXPEDIA_PROPERTY_ID || ""
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}

export default Page
