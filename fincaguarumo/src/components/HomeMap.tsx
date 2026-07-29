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
import { ReviewSummary } from "./ReviewSummary"
import Link from "next/link"
import Icon from "./Icon"
import Title from "./Title"

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
  const b = useTranslations("reviews")

  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY as string}
      // onLoad={() => console.log("Maps API has loaded.")}
    >
      <HomeMapContent />
      <div className="w-11/12 max-w-240! mx-auto">
        <PlaceProvider placeId={placeId}>
          <Title
            Heading="h2"
            titleClassName="text-3xl my-5"
            title={b("title")}
          />
          <ReviewSummary />
          <div className="w-full flex justify-end">
            <Link
              href={`/reviews`}
              className="w-80 inline-flex items-center justify-end h-full group no-underline mt-8 mr-4"
            >
              {b("readMoreReviews") || "Read more reviews"}
              <Icon
                icon="ArrowRight"
                className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
                color="currentColor"
              />
            </Link>
          </div>
        </PlaceProvider>
      </div>
    </APIProvider>
  )
}

export default HomeMap
