"use client"
import React, { useEffect } from "react"
import Slideshow from "@/components/Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"
import { titleCase } from "@/lib/utils"
import { notFound } from "next/navigation"
import { useBooking } from "../../../../providers/BookingProvider"
import { BOOKING_TYPE, BookingData, TTour } from "../../../../../types"
import TourMetadata from "@/components/TourMetadata"
import { urlFor } from "@/sanity/lib/image"

const TourPage = ({ tour, locale }: { tour: TTour; locale: string }) => {
  if (!tour || !tour.isPublished) notFound()
  const { setBookingData } = useBooking()

  useEffect(() => {
    setBookingData((prev: BookingData) => {
      const nextBookingDetails = {
        ...(prev?.bookingDetails ?? {}),
        type: BOOKING_TYPE.tour,
        title: tour.title,
        description: tour.description,
        price: tour.price,
        totalPrice: tour.price,
        duration: tour.duration ?? 0,
        location: tour.location ?? "",
        body: tour.body,
        geo: tour.geo ?? { lat: 0, lng: 0 },
      }
      if (
        JSON.stringify(prev.bookingDetails) ===
        JSON.stringify(nextBookingDetails)
      ) {
        return prev
      }

      return { ...prev, bookingDetails: nextBookingDetails }
    })
  }, [tour, setBookingData])

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
    </>
  )
}

export default TourPage
