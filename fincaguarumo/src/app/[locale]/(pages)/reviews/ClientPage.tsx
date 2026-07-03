"use client"

import { APIProvider } from "@vis.gl/react-google-maps"
import { PlaceProvider } from "../../../providers/PlaceProvider"
import { PlaceReviews } from "../../../../components/PlaceReviews"
import { placeId } from "../../../../../data/geo"
import GuestLikesSummary from "../../../../components/GuestLikesSummary"

const ClientPage = () => {
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}
      // onLoad={() => console.log("Maps API has loaded.")}
    >
      <PlaceProvider placeId={placeId}>
        <GuestLikesSummary />

        <PlaceReviews showMoreLink={false} />
      </PlaceProvider>
    </APIProvider>
  )
}

export default ClientPage
