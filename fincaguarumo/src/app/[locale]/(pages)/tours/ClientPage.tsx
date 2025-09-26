"use client"
import React from "react"
import { useParams, usePathname } from "next/navigation"
import Tour, { TourType } from "./TourItem"

const ClientPage = ({
  tours: toursProp,
  locale,
}: {
  tours: TourType[]
  locale: string
}) => {
  const pathname = usePathname()

  const tours = toursProp
    .filter((tour: TourType) => tour.isPublished)
    .map((tour: Omit<TourType, "href">) => ({
      href: `${pathname}/${tour.slug.current}`,
      ...tour,
    }))
  const part1 = tours.slice(0, tours.length / 3)
  const part2 = tours.slice(tours.length / 3, (tours.length / 3) * 2)
  const part3 = tours.slice((tours.length / 3) * 2, tours.length)

  return (
    <div className="overflow-y-hidden columns grid gap-5 grid-cols-1 md:grid-cols-3 items-start w-11/12 mx-auto relative">
      {!!part1.length && (
        <div className="column column-reverse flex flex-col md:py-2">
          {part1.map((tour: TourType) => {
            return (
              <Tour
                key={`tour-${tour.slug.current}`}
                {...tour}
                locale={locale}
              />
            )
          })}
        </div>
      )}
      {!!part2.length && (
        <div className="column flex flex-col md:py-2">
          {part2.map((tour: TourType) => {
            return (
              <Tour
                key={`tour-${tour.slug.current}`}
                {...tour}
                locale={locale}
              />
            )
          })}
        </div>
      )}
      {!!part3.length && (
        <div className="column column-reverse flex flex-col md:py-2">
          {part3.map((tour: TourType) => {
            return (
              <Tour
                key={`tour-${tour.slug.current}`}
                {...tour}
                locale={locale}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ClientPage
