"use client"

import { createContext, useContext } from "react"
import { useParams } from "next/navigation"
import { TOUR_QUERY } from "@/sanity/lib/queries"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import { useBookingCore } from "./BookingCoreProvider"

export interface TourContent {
  slug: string
  title: string
  description: string
  price: number
  location?: string
  geo?: { lat: number; lng: number }
  duration: number
  mainImage?: any
  slideshow?: { images: any[] }
}

type TourBookingContextValue = {
  fetchTourBasic: () => Promise<TourContent>
  fetchTourDetailed: () => Promise<TourContent>
}

const TourBookingContext = createContext<TourBookingContextValue>({
  fetchTourBasic: async () => {
    throw new Error("TourBookingProvider not mounted")
  },
  fetchTourDetailed: async () => {
    throw new Error("TourBookingProvider not mounted")
  },
})

export const useTourBooking = () => useContext(TourBookingContext)

export const TourBookingProvider = ({
  children,
  slug,
}: {
  children: React.ReactNode
  slug: string
}) => {
  const { locale } = useParams()
  const { setBookingType, setBasicDetails, setPricing } = useBookingCore()

  const mapContentToTour = (content: any): TourContent => ({
    slug: content.slug?.current,
    title: content.title,
    description: content.description,
    price: content.price,
    location: content.location,
    geo: content.geo,
    duration: content.duration,
    mainImage: content.mainImage,
    slideshow: content.slideshow,
  })

  const fetchTour = async (detailed: boolean): Promise<TourContent> => {
    const content = await clientSideFetch(
      TOUR_QUERY,
      { slug, language: locale as string },
      detailed ? 300 : 3600,
    )

    if (!content) {
      throw new Error("Tour data not found")
    }

    const tour = mapContentToTour(content)

    // Push basic info into core
    setBookingType("tour")
    setBasicDetails({
      title: tour.title,
      description: tour.description,
      location: tour.location || "",
    })

    // Single rate: set baseUnitPrice once.
    setPricing({
      baseUnitPrice: tour.price,
      currency: "USD", // or content.currency if you have it
    })

    return tour
  }

  const fetchTourBasic = () => fetchTour(false)
  const fetchTourDetailed = () => fetchTour(true)

  return (
    <TourBookingContext.Provider
      value={{
        fetchTourBasic,
        fetchTourDetailed,
      }}
    >
      {children}
    </TourBookingContext.Provider>
  )
}
