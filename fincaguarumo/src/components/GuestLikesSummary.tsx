"use client"
import React from "react"
import { usePlace } from "../app/providers/PlaceProvider"
import { TReview } from "../types"
import useSWR from "swr"
import { REVIEWS_QUERY } from "../sanity/lib/queries"
import { clientSideFetch } from "../sanity/lib/clientSide"
import Title from "./Title"

export const GuestLikesSummary = () => {
  const { place } = usePlace()
  const { data: sanityReviews } = useSWR(REVIEWS_QUERY, clientSideFetch)

  // Compute stable review array
  const stableAllReviews = React.useMemo(() => {
    if (!place) return []
    return [...(place.reviews ?? []), ...(sanityReviews ?? [])] as TReview[]
  }, [place, JSON.stringify(place?.reviews), JSON.stringify(sanityReviews)])

  // Convert reviews to format expected by API
  const reviewsForProcessing = React.useMemo(() => {
    return stableAllReviews.map(review => ({
      text: review?.text || review?.reviewText || "",
      rating: review?.rating || 0,
      date: review?.date || new Date(),
      platform: review?.platform || "google",
    }))
  }, [stableAllReviews])

  // Call API to process reviews server-side
  const { data: processedData, error } = useSWR(
    reviewsForProcessing.length > 0
      ? ["/api/process-reviews", JSON.stringify(reviewsForProcessing)]
      : null,
    async () => {
      const response = await fetch("/api/process-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: reviewsForProcessing }),
      })
      if (!response.ok) throw new Error("Failed to process reviews")
      return response.json()
    },
  )

  const processedAspects = processedData?.processedAspects || []
  const summaryText = processedData?.summaryText || ""

  if (!place) return null

  return (
    <div className="prose w-11/12 lg:prose-lg mx-auto py-5 mt-5">
      {processedAspects.length > 0 && (
        <div className="bg-gradient-dark rounded-lg shadow-sm p-6">
          <Title
            title="What guests like most"
            Heading="h2"
            titleClassName="text-3xl font-bold text-guarumo-primary dark:text-zinc-50 mt-5 mb-4 px-4"
            icon={{ iconClassName: "fill-guarumo-primary dark:fill-zinc-50" }}
          />
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {summaryText}
          </p>

          {/* Show top aspects as badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {processedAspects.slice(0, 5).map((aspect: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-guarumo-primary/10 text-guarumo-primary dark:bg-zinc-700 dark:text-zinc-300"
              >
                {aspect.aspect} ({Math.round(aspect.mentionCount)} mentions)
              </span>
            ))}
          </div>
        </div>
      )}

      {!processedAspects.length && stableAllReviews.length > 0 && (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <p className="text-zinc-700 dark:text-zinc-300">
            Not enough review data available to generate a summary.
          </p>
        </div>
      )}
    </div>
  )
}

export default GuestLikesSummary
