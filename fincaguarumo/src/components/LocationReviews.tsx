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
import { useTranslations } from "next-intl"
import Link from "next/link"
import Icon from "./Icon"

type LocationReviewsMode = "infinite" | "preview"

export const LocationReviews = ({
  initialCount = 8,
  showMoreLink = true,
  mode = "infinite",
}: {
  initialCount?: number
  showMoreLink?: boolean
  mode?: LocationReviewsMode
}) => {
  const t = useTranslations("reviews")
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

  const isPreviewMode = mode === "preview"

  // Track displayed reviews - append more as they load
  const [displayedCount, setDisplayedCount] = useState(initialCount)

  // Determine if we've loaded all available reviews
  const isAllLoaded = displayedCount >= allReviews.length

  // Load more - if more reviews available locally, just show them; otherwise fetch more GBP pages
  const handleLoadMore = async () => {
    if (isAllLoaded) return

    // If there are more reviews already loaded locally, just show them
    if (displayedCount < allReviews.length) {
      setDisplayedCount(prev =>
        Math.min(prev + initialCount, allReviews.length),
      )
      return
    }

    // Otherwise, fetch more GBP pages (only in infinite mode)
    if (!isPreviewMode && !loadingMore && hasMore) {
      await loadMore()
    }
  }

  // Loading states
  if (loading) return <Loading />
  if (error) return <div className="py-5 text-destructive">Error: {error}</div>

  // In preview mode, only show initialCount; in infinite mode, show all loaded
  const displayedReviews = allReviews.slice(
    0,
    isPreviewMode ? initialCount : displayedCount,
  )

  // In preview mode, show link if there are more reviews than displayed
  const hasMoreToShow = isPreviewMode
    ? allReviews.length > initialCount
    : !isAllLoaded
  console.log({ allReviewsLength: allReviews.length })

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
            <FadeInObserver
              key={`${review?.date || index}-${review?.author?.name || review?.authorAttribution?.displayName}-${index}`}
              className="fade-in"
            >
              <Review review={review} />
            </FadeInObserver>
          ))}
        </div>
      )}
      {!isAllLoaded && showMoreLink && hasMoreToShow && isPreviewMode && (
        <div className="w-full flex justify-center mt-8">
          <Link
            href="/reviews"
            className="w-64 inline-flex items-center justify-center h-full group no-underline"
          >
            {t("readAllReviews")}
            <Icon
              icon="ArrowRight"
              className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
              color="currentColor"
            />
          </Link>
        </div>
      )}
      {!isPreviewMode && !isAllLoaded && showMoreLink && hasMoreToShow && (
        <div className="w-full flex justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={loadingMore || isAllLoaded}
            className="w-64"
          >
            {loadingMore ? <Loading /> : t("loadMoreReviews")}
          </Button>
        </div>
      )}
    </div>
  )
}
