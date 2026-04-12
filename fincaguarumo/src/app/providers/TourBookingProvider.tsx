"use client"

import React, { createContext, useContext } from "react"
import { useParams } from "next/navigation"
import useSWR from "swr"
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
  basicTourData: TourContent | undefined
  detailedTourData: TourContent | undefined
  isLoadingBasic: boolean
  isLoadingDetailed: boolean
  error: any
}

const TourBookingContext = createContext<TourBookingContextValue>({
  basicTourData: undefined,
  detailedTourData: undefined,
  isLoadingBasic: false,
  isLoadingDetailed: false,
  error: null,
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

  // SWR for basic tour data
  const {
    data: basicTourData,
    isLoading: isLoadingBasic,
    error,
  } = useSWR(
    [TOUR_QUERY, { slug, language: locale as string }, 3600],
    ([query, params, revalidate]) => clientSideFetch(query, params, revalidate),
  )

  // SWR for detailed tour data
  const { data: detailedTourData, isLoading: isLoadingDetailed } = useSWR(
    [TOUR_QUERY, { slug, language: locale as string }, 300],
    ([query, params, revalidate]) => clientSideFetch(query, params, revalidate),
  )

  // Update booking core when basic data is available
  React.useEffect(() => {
    if (basicTourData) {
      const tour = mapContentToTour(basicTourData)
      setBookingType("tour")
      setBasicDetails({
        title: tour.title,
        description: tour.description,
        location: tour.location || "",
      })
      setPricing({
        baseUnitPrice: tour.price,
        currency: "USD",
      })
    }
  }, [basicTourData, setBookingType, setBasicDetails, setPricing])

  return (
    <TourBookingContext.Provider
      value={{
        basicTourData: basicTourData
          ? mapContentToTour(basicTourData)
          : undefined,
        detailedTourData: detailedTourData
          ? mapContentToTour(detailedTourData)
          : undefined,
        isLoadingBasic,
        isLoadingDetailed,
        error,
      }}
    >
      {children}
    </TourBookingContext.Provider>
  )
}
