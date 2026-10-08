"use client"
import {
  Map,
  MapCameraChangedEvent,
  AdvancedMarker,
  useApiIsLoaded,
  APIProvider,
} from "@vis.gl/react-google-maps"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { coords, placeId } from "../../data/geo"
import Title from "./Title"
import { PlaceProvider } from "@/app/providers/PlaceProvider"

const HomeMapContent = () => {
  const t = useTranslations("map")
  const apiIsLoaded = useApiIsLoaded()
  if (!apiIsLoaded) return null
  return (
    <div className="w-11/12 max-w-240! mx-auto my-8">
      <div className="relative">
        <Title
          Heading="h2"
          titleClassName="text-3xl my-5"
          title={t("location")}
        />
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
                ev.detail.zoom,
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
  )
}

const HomeMap = () => {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}>
      <PlaceProvider placeId={placeId}>
        <HomeMapContent />
      </PlaceProvider>
    </APIProvider>
  )
}

export default HomeMap
