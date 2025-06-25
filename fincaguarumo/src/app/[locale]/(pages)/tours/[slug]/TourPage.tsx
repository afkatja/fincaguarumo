"use client"
import React from "react"
import Slideshow from "@/components/Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"
import { TTour } from "../data"
import { titleCase } from "../../../../../lib/utils"
import { notFound } from "next/navigation"

const TourPage = ({ tour }: { tour: TTour }) => {
  if (!tour || !tour.isPublished) notFound()

  return (
    <DetailsPageLayout
      title={tour.title}
      description={tour.description}
      slideshow={
        <Slideshow
          images={tour?.slideshow?.images ?? [tour.mainImage]}
          showExpand={false}
        />
      }
      price={tour.price ?? "0"}
      location={tour.location ?? ""}
      duration={tour.duration ?? ""}
      body={tour.body}
      parent={{ title: "Tours", href: "tours" }}
      icon={tour?.slug?.current ? titleCase(tour?.slug?.current) : undefined}
    />
  )
}

export default TourPage
