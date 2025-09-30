"use client"
import React from "react"
import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps"
import Image from "next/image"
import Review from "./Review"
import { PlaceProvider, usePlace } from "../app/providers/PlaceProvider"

type Review = {
  authorAttribution: {
    displayName: string
    uri: string
  }
  rating: number
  text: string
}

const placeId = "ChIJM5QhUwBhpI8RJqrQASxdNE0" // Villa Bruno, not Finca Guarumo
const coords = { lat: 8.496420632614996, lng: -83.3341457939961 }

const PlaceReviews = () => {
  const { place } = usePlace()

  if (!place) return null

  return (
    <div className="py-5 lg:px-40 mt-5">
      <h2 className="text-3xl mt-5 mb-4">What our guests say</h2>
      {place.reviews && place.reviews.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {place.reviews.map(
            (review: google.maps.places.Review, index: number) => (
              <Review key={index} review={review} />
            )
          )}
        </div>
      )}
    </div>
  )
}

const HomeMap = () => {
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}
      onLoad={() => console.log("Maps API has loaded.")}
    >
      <div className="max-w-[60rem] mx-auto my-8">
        <div className="!w-11/12 mx-auto relative">
          <h2 className="text-3xl my-5">Location</h2>
          <div className="h-96 mt-4">
            <Map
              mapId={process.env.NEXT_PUBLIC_GMAPS_MAP_ID as string}
              zoom={14}
              center={{ lat: coords.lat, lng: coords.lng }}
              onCameraChanged={(ev: MapCameraChangedEvent) =>
                console.log(
                  "camera changed:",
                  ev.detail.center,
                  "zoom:",
                  ev.detail.zoom
                )
              }
            >
              <AdvancedMarker position={{ lat: coords.lat, lng: coords.lng }}>
                <Image
                  src="/images/logo-single.svg"
                  alt="finca guarumo pin"
                  width={30}
                  height={30}
                  className="animate-bounce shadow-lg rounded-full"
                />
              </AdvancedMarker>
            </Map>
          </div>
        </div>
      </div>
      <PlaceProvider placeId={placeId}>
        <PlaceReviews />
      </PlaceProvider>
    </APIProvider>
  )
}

export default HomeMap
