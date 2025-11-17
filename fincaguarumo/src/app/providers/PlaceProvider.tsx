"use client"
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps"

type PlaceDetails = {
  displayName?: string | null
  formattedAddress?: string | null
  rating?: number | null
  reviews?: google.maps.places.Review[] | null
}

type PlaceContextType = {
  place: PlaceDetails | null
  loading: boolean
  error: string | null
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined)

type PlaceProviderProps = {
  placeId: string
  children: ReactNode
}

export const PlaceProvider: React.FC<PlaceProviderProps> = ({
  placeId,
  children,
}) => {
  const lib = useMapsLibrary("places")
  const map = useMap()
  const [place, setPlace] = useState<PlaceDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lib) return

    const fetchPlaceDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const { Place } = lib
        const placeInstance = new Place({
          id: placeId,
        })

        const request = {
          fields: ["displayName", "rating", "formattedAddress", "reviews"],
        }

        const result = await placeInstance.fetchFields(request)
        // console.log("Place details:", result.place)

        // Extract the place details
        const placeDetails: PlaceDetails = {
          displayName: result.place.displayName,
          formattedAddress: result.place.formattedAddress,
          rating: result.place.rating,
          reviews: result.place.reviews,
        }

        setPlace(placeDetails)
      } catch (err) {
        console.error("Error fetching place details:", err)
        setError("Failed to fetch place details")
      } finally {
        setLoading(false)
      }
    }

    fetchPlaceDetails()
  }, [lib, map, placeId])

  return (
    <PlaceContext.Provider value={{ place, loading, error }}>
      {children}
    </PlaceContext.Provider>
  )
}

export const usePlace = (): PlaceContextType => {
  const context = useContext(PlaceContext)

  if (context === undefined) {
    throw new Error("usePlace must be used within a PlaceProvider")
  }
  return context
}
