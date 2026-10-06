"use client"
import React, { useState, useMemo } from "react"
import { useReviews } from "@/app/providers/ReviewsProvider"
import Review from "./Review"
import { TReview } from "@/types"
import Title from "./Title"
import useSWR from "swr"
import { REVIEWS_QUERY } from "@/sanity/lib/queries"
import { clientSideFetch } from "@/sanity/lib/clientSide"
import { Button } from "@/components/ui/button"
import Loading from "../app/[locale]/loading"
import FadeInObserver from "./FadeInObserver"

export const LocationReviews = ({
  initialCount = 8,
  showMoreLink = true,
}: {
  initialCount?: number
  showMoreLink?: boolean
}) => {
  const {
    reviews: gbpReviews,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
  } = useReviews()
  const { data: sanityReviews } = useSWR(REVIEWS_QUERY, clientSideFetch)

  // Combine all reviews once (Sanity + GBP), sorted by date newest first
  const allReviews = useMemo(() => {
    const combined = [...(sanityReviews ?? []), ...(gbpReviews ?? [])]
    return combined.sort((a, b) => {
      const dateA = a?.date || ""
      const dateB = b?.date || ""
      return dateB.localeCompare(dateA)
    })
  }, [JSON.stringify(sanityReviews), JSON.stringify(gbpReviews)])

  // Track displayed reviews - append more as they load
  const [displayedCount, setDisplayedCount] = useState(initialCount)

  // Determine if we've loaded all available reviews
  const isAllLoaded = displayedCount >= allReviews.length

  // Load more - if more reviews available locally, just show them; otherwise fetch more GBP pages
  const handleLoadMore = async () => {
    if (isAllLoaded) return
    
    // If there are more reviews already loaded locally, just show them
    if (displayedCount < allReviews.length) {
      setDisplayedCount(prev => Math.min(prev + initialCount, allReviews.length))
      return
    }
    
    // Otherwise, fetch more GBP pages
    if (!loadingMore && hasMore) {
      await loadMore()
    }
  }

  // Loading states
  if (loading) return <Loading />
  if (error) return <div className="py-5 text-destructive">Error: {error}</div>

  const displayedReviews = allReviews.slice(0, displayedCount)

  return (
    <div className="py-5 lg:px-40 mt-5">
      <Title
        title="What our guests say"
        Heading="h2"
        titleClassName="text-3xl font-bold text-guarumo-primary dark:text-zinc-50 mt-5 mb-4 px-4"
        icon={{ iconClassName: "fill-guarumo-primary dark:fill-zinc-50" }}
      />
      {displayedReviews.length > 0 && (
        <div className="md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedReviews.map((review: TReview, index) => (
            <FadeInObserver key={`${review?.date || index}-${review?.author?.name || review?.authorAttribution?.displayName}-${index}`} className="fade-in">
              <Review
                review={review}
              />
            </FadeInObserver>
          ))}
        </div>
      )}
      {!isAllLoaded && showMoreLink && (
        <div className="w-full flex justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={loadingMore || isAllLoaded}
            className="w-64"
          >
            {loadingMore ? <Loading /> : "Load more reviews"}
          </Button>
        </div>
      )}
    </div>
  )
}