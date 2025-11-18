"use client"
import React from "react"

import { APIProvider } from "@vis.gl/react-google-maps"
import { PlaceProvider } from "../../../providers/PlaceProvider"
import { PlaceReviews } from "../../../../components/PlaceReviews"
import { placeId } from "../../../../../data/geo"

const ClientPage = () => {
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}
      // onLoad={() => console.log("Maps API has loaded.")}
    >
      <PlaceProvider placeId={placeId}>
        <PlaceReviews />
      </PlaceProvider>
    </APIProvider>
  )
}

export default ClientPage
