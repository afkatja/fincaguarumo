"use client"
import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
  AdvancedMarker,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { PlaceProvider } from "../app/providers/PlaceProvider"
import { PlaceReviews } from "./PlaceReviews"
import { coords, placeId } from "../../data/geo"

const HomeMap = () => {
  const t = useTranslations("map")
  const apiIsLoaded = useApiIsLoaded()
  if (apiIsLoaded) return null
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}
      // onLoad={() => console.log("Maps API has loaded.")}
    >
      <div className="max-w-240 mx-auto my-8">
        <div className="w-11/12! mx-auto relative">
          <h2 className="text-3xl my-5">{t("location")}</h2>
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
