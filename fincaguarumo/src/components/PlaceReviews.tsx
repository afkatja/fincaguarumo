"use client"
import React from "react"
import { usePlace } from "../app/providers/PlaceProvider"
import Review from "./Review"
import { TReview } from "../types"
import { shuffle } from "../lib/utils"
import Title from "./Title"
import useSWR from "swr"
import { REVIEWS_QUERY } from "../sanity/lib/queries"
import { clientSideFetch } from "../sanity/lib/clientSide"

export const PlaceReviews = ({ count }: { count?: number }) => {
  const { place } = usePlace()
  const { data: sanityReviews } = useSWR(REVIEWS_QUERY, clientSideFetch)

  if (!place) return null

  const allReviews = [
    ...(place.reviews ?? []),
    ...(sanityReviews ?? []),
  ] as TReview[]

  const memoizedShuffled = React.useMemo(
    () => shuffle(allReviews),
    [allReviews],
  )

  const reviewsToShow = count
    ? memoizedShuffled
        .filter(review => {
          const text = review?.text ?? review?.reviewText ?? ""
          return text.length > 100
        })
        .slice(0, count)
    : allReviews

  return (
    <div className="py-5 lg:px-40 mt-5">
      <Title
        title="What our guests say"
        Heading="h2"
        titleClassName="text-3xl font-bold text-guarumo-primary dark:text-zinc-50 mt-5 mb-4 px-4"
        icon={{ iconClassName: "fill-guarumo-primary dark:fill-zinc-50" }}
      />
      {reviewsToShow.length > 0 && (
        <div className="p-4 lg:p-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviewsToShow.map((review: TReview, index) => (
            <Review
              key={`${review?.date}-${review?.author?.name || review?.authorAttribution?.displayName}-${index}`}
              review={review}
            />
          ))}
        </div>
      )}
    </div>
  )
}
