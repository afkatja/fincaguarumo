"use client"

import React, { createContext, useContext } from "react"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ACCOMMODATION_QUERY } from "@/sanity/lib/queries"
import { PricingRule } from "@/lib/pricingEngine"
import { clientSideFetch } from "../../sanity/lib/clientSide"
import { useBookingCore } from "./BookingCoreProvider"

type AccommodationContent = {
  title: string
  description: string
  mainImage: any
  body: any
  isPublished: boolean
  slideshow?: { images: any[] }
  pricingRules?: PricingRule[]
  capacity?: number
  bedrooms?: number
  bathrooms?: number
  propertyType?: string
  location?: {
    address?: string
    coordinates?: { lat: number; lng: number }
  }
  checkInTime?: string
  checkOutTime?: string
  amenities?: any[]
  paymentMethods?: any[]
  cancellationPolicy?: any
  logistics?: any[]
  highlightFeatures?: Array<{
    title: string
    description: string
    icon?: string
  }>
}

export interface VillaContent {
  title: string
  description: string
  location?: string
  geo?: { lat: number; lng: number }
  pricingRules: PricingRule[]
  mainImage?: any
  slideshow?: { images: any[] }
  // optional extras if you need them later
  capacity?: number
  bedrooms?: number
  bathrooms?: number
  checkInTime?: string
  checkOutTime?: string
  amenities?: any[]
  paymentMethods?: any[]
  cancellationPolicy?: any
  logistics?: any[]
  highlightFeatures?: Array<{
    title: string
    description: string
    icon?: string
  }>
  propertyType?: string
}

type VillaBookingContextValue = {
  basicVillaData: VillaContent | undefined
  detailedVillaData: VillaContent | undefined
  pricingRules: PricingRule[] | undefined
  isLoadingBasic: boolean
  isLoadingDetailed: boolean
  isLoadingPricing: boolean
  error: any
}

const VillaBookingContext = createContext<VillaBookingContextValue>({
  basicVillaData: undefined,
  detailedVillaData: undefined,
  pricingRules: undefined,
  isLoadingBasic: false,
  isLoadingDetailed: false,
  isLoadingPricing: false,
  error: null,
})

export const useVillaBooking = () => useContext(VillaBookingContext)

export const VillaBookingProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { locale } = useParams()
  const { setBookingType, setBasicDetails, setPricing } = useBookingCore()

  const mapContentToVilla = (content: AccommodationContent): VillaContent => ({
    title: content.title,
    description: content.description,
    location: content.location?.address,
    geo: content.location?.coordinates,
    pricingRules: content.pricingRules || [],
    mainImage: content.mainImage,
    slideshow: content.slideshow,
    capacity: content.capacity,
    bedrooms: content.bedrooms,
    bathrooms: content.bathrooms,
    checkInTime: content.checkInTime,
    checkOutTime: content.checkOutTime,
    amenities: content.amenities,
    paymentMethods: content.paymentMethods,
    cancellationPolicy: content.cancellationPolicy,
    logistics: content.logistics,
    highlightFeatures: content.highlightFeatures,
    propertyType: content.propertyType,
  })

  // SWR for basic villa data
  const {
    data: basicVillaData,
    isLoading: isLoadingBasic,
    error,
  } = useSWR(
    [
      ACCOMMODATION_QUERY,
      { slug: "villa-bruno", language: locale as string },
      3600,
    ],
    ([query, params, revalidate]) => clientSideFetch(query, params, revalidate),
  )

  // SWR for detailed villa data
  const { data: detailedVillaData, isLoading: isLoadingDetailed } = useSWR(
    [
      ACCOMMODATION_QUERY,
      { slug: "villa-bruno", language: locale as string },
      300,
    ],
    ([query, params, revalidate]) => clientSideFetch(query, params, revalidate),
  )

  // SWR for pricing rules
  const { data: pricingRules, isLoading: isLoadingPricing } = useSWR(
    [
      ACCOMMODATION_QUERY,
      { slug: "villa-bruno", language: locale as string },
      3600,
    ],
    ([query, params, revalidate]) => clientSideFetch(query, params, revalidate),
  )

  // Update booking core when basic data is available
  React.useEffect(() => {
    if (basicVillaData) {
      const villa = mapContentToVilla(basicVillaData)
      setBookingType("villa")
      setBasicDetails({
        title: villa.title,
        description: villa.description,
        location: villa.location || "",
      })
      // For villa we DON'T set baseUnitPrice here because pricing depends on rules
      setPricing({ currency: "USD" })
    }
  }, [basicVillaData, setBookingType, setBasicDetails, setPricing])

  return (
    <VillaBookingContext.Provider
      value={{
        basicVillaData: basicVillaData
          ? mapContentToVilla(basicVillaData)
          : undefined,
        detailedVillaData: detailedVillaData
          ? mapContentToVilla(detailedVillaData)
          : undefined,
        pricingRules: pricingRules?.pricingRules || [],
        isLoadingBasic,
        isLoadingDetailed,
        isLoadingPricing,
        error,
      }}
    >
      {children}
    </VillaBookingContext.Provider>
  )
}
