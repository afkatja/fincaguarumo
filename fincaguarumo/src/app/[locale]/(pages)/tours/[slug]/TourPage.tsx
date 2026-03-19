"use client"
import React, { useEffect } from "react"
import Slideshow from "@/components/Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"
import { notFound } from "next/navigation"
import { useBookingCore } from "../../../../providers/BookingCoreProvider"

import { BOOKING_TYPE, TTour } from "../../../../../types"
import TourMetadata from "@/components/TourMetadata"
import { urlFor } from "@/sanity/lib/image"
import { TourBookingProvider } from "../../../../providers/TourBookingProvider"

const TourPage = ({ tour, locale }: { tour: TTour; locale: string }) => {
  if (!tour || !tour.isPublished) notFound()
  const { setBookingType, setPricing, setBasicDetails } = useBookingCore()

  useEffect(() => {
    setBookingType(BOOKING_TYPE.tour)
    setPricing({ baseUnitPrice: tour.price })
    setBasicDetails({
      title: tour.title,
      description: tour.description,
      location: tour.location || "",
    })
  }, [tour])

  return (
    <>
      <TourMetadata
        tour={{
          ...tour,
          mainImage: tour.mainImage
            ? { url: urlFor(tour.mainImage).url() }
            : undefined,
        }}
        locale={locale}
      />
      <TourBookingProvider slug={tour.slug?.current || ""}>
        <DetailsPageLayout
          bookingDetails={{
            title: tour.title,
            description: tour.description,
            duration: tour.duration,
            location: tour.location,
            price: tour.price,
            body: tour.body,
            geo: tour.geo,
          }}
          slideshow={
            tour?.slideshow?.images.length || tour.mainImage ? (
              <Slideshow
                images={tour?.slideshow?.images ?? [tour.mainImage]}
                showExpand={false}
              />
            ) : null
          }
          parent={{ title: "Tours", href: "tours" }}
          // icon={tour?.slug?.current ? titleCase(tour?.slug?.current) : undefined}
          bookingType={BOOKING_TYPE.tour}
          locale={locale}
          dialogId={tour.dialog?._id}
        />
      </TourBookingProvider>
    </>
  )
}

export default TourPage
