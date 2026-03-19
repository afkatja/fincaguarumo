"use client"

import { createContext, useContext, useState } from "react"
import { useParams } from "next/navigation"
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
  // purely fetch + transform: no React state here
  fetchVillaBasic: () => Promise<VillaContent>
  fetchVillaDetailed: () => Promise<VillaContent>
  fetchVillaPricingRules: () => Promise<PricingRule[]>
  // loading: boolean
}

const VillaBookingContext = createContext<VillaBookingContextValue>({
  fetchVillaBasic: async () => {
    throw new Error("VillaBookingProvider not mounted")
  },
  fetchVillaDetailed: async () => {
    throw new Error("VillaBookingProvider not mounted")
  },
  fetchVillaPricingRules: async () => {
    throw new Error("VillaBookingProvider not mounted")
  },
  // loading: false,
})

export const useVillaBooking = () => useContext(VillaBookingContext)

export const VillaBookingProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { locale } = useParams()
  const { setBookingType, setBasicDetails, setPricing } = useBookingCore()
  // const [loading, setLoading] = useState(false)

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

  const fetchVilla = async (detailed: boolean): Promise<VillaContent> => {
    // setLoading(true)
    try {
      const content = await clientSideFetch(
        ACCOMMODATION_QUERY,
        { slug: "villa-bruno", language: locale as string },
        detailed ? 300 : 3600,
      )

      if (!content) {
        throw new Error("Villa data not found")
      }

      const villa = mapContentToVilla(content)

      // Push basic info into core
      setBookingType("villa")
      setBasicDetails({
        title: villa.title,
        description: villa.description,
        location: villa.location || "",
      })

      // For villa we DON’T set baseUnitPrice here because pricing depends on rules
      // You can set a default currency
      setPricing({ currency: "USD" })

      return villa
    } catch (error) {
      console.error("Error fetching villa:", error)
      throw error
    } finally {
      // setLoading(false)
    }
  }

  const fetchVillaPricingRules = async (): Promise<PricingRule[]> => {
    try {
      const content = await clientSideFetch(
        ACCOMMODATION_QUERY,
        { slug: "villa-bruno", language: locale as string },
        3600, // Use longer cache for pricing rules
      )

      if (!content) {
        throw new Error("Villa pricing rules not found")
      }

      return content.pricingRules || []
    } catch (error) {
      console.error("Error fetching villa pricing rules:", error)
      throw error
    }
  }

  const fetchVillaBasic = () => fetchVilla(false)
  const fetchVillaDetailed = () => fetchVilla(true)

  return (
    <VillaBookingContext.Provider
      value={{
        fetchVillaBasic,
        fetchVillaDetailed,
        fetchVillaPricingRules,
        // loading,
      }}
    >
      {children}
    </VillaBookingContext.Provider>
  )
}
