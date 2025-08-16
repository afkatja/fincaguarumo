"use client"
import React, { useCallback, useEffect } from "react"
import Slideshow from "@/components/Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"
import { TTour } from "../data"
import { titleCase } from "@/lib/utils"
import { notFound } from "next/navigation"
import { useBooking } from "../../../BookingProvider"
import { BOOKING_TYPE } from "../../../../../types"

const TourPage = ({ tour, locale }: { tour: TTour; locale: string }) => {
  if (!tour || !tour.isPublished) notFound()
  const { bookingData, setBookingData } = useBooking()

  const newBookingDetails = {
    ...bookingData,
    bookingDetails: {
      ...bookingData.bookingDetails,
      type: BOOKING_TYPE.tour,
      title: tour.title,
      description: tour.description,
      price: tour.price,
      totalPrice: tour.price,
      duration: tour.duration ?? 0,
      location: tour.location ?? "",
      body: tour.body,
      geo: tour.geo ?? { lat: 0, lng: 0 },
    },
  }

  const updateBookingData = useCallback(
    (newData: Record<string, any>) => {
      setBookingData(prevData => {
        if (
          JSON.stringify(prevData.bookingDetails) ===
          JSON.stringify(newData.bookingDetails)
        )
          return prevData
        return { ...prevData, ...newData }
      })
    },
    [setBookingData]
  )

  useEffect(() => {
    updateBookingData(newBookingDetails)
  }, [])

  return (
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
        <Slideshow
          images={tour?.slideshow?.images ?? [tour.mainImage]}
          showExpand={false}
        />
      }
      parent={{ title: "Tours", href: "tours" }}
      icon={tour?.slug?.current ? titleCase(tour?.slug?.current) : undefined}
      bookingType={BOOKING_TYPE.tour}
      locale={locale}
      dialogId={tour.dialog?._ref}
    />
  )
}

export default TourPage
