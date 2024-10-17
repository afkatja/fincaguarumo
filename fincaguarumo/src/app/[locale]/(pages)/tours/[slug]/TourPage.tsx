"use client"
import React from "react"
import Slideshow from "./Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"
import { TTour } from "../data"

const titleCase = (str: string) =>
  str.charAt(0).toUpperCase() + str.substring(1).toLowerCase()

const TourPage = ({ tour }: { tour: TTour }) => {
  if (!tour) return "TODO 404"

  return (
    <DetailsPageLayout
      title={tour.title}
      description={tour.description}
      slideshow={<Slideshow images={tour.images} />}
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
