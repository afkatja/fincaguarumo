"use client"
import React, { useEffect } from "react"
import Slideshow from "@/components/Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"
import { TTour } from "../data"
import { titleCase } from "../../../../../lib/utils"
import { notFound } from "next/navigation"
import { useBooking } from "../../../BookingProvider"

const TourPage = ({ tour }: { tour: TTour }) => {
  if (!tour || !tour.isPublished) notFound()
  const { bookingData, setBookingData } = useBooking()

  useEffect(() => {
    setBookingData({
      ...bookingData,
      tourDetails: {
        title: tour.title,
        description: tour.description,
        price: tour.price,
        duration: tour.duration,
        location: tour.location,
        body: tour.body,
        guests: "1",
        geo: tour.geo,
      },
    })
  }, [tour])

  return (
    <DetailsPageLayout
      tourDetails={{
        title: tour.title,
        description: tour.description,
        duration: tour.duration,
        location: tour.location,
        price: tour.price,
        body: tour.body,
      }}
      slideshow={
        <Slideshow images={tour?.slideshow?.images ?? [tour.mainImage]} />
      }
      parent={{ title: "Tours", href: "tours" }}
      icon={tour?.slug?.current ? titleCase(tour?.slug?.current) : undefined}
    />
  )
}

export default TourPage
