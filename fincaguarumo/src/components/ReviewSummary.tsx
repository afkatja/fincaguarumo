"use client"
import React from "react"
import { usePlace } from "../app/providers/PlaceProvider"
import Image from "next/image"
import { TReview } from "../types"
import useSWR from "swr"
import { REVIEWS_QUERY } from "../sanity/lib/queries"
import { clientSideFetch } from "../sanity/lib/clientSide"
import { Badge } from "./ui/badge"
import { useTranslations } from "next-intl"
import { starIcons } from "./Review"
import { DynamicLucideIcon } from "./DynamicLucideIcon"
import { normalizeRatingTo5Stars } from "../lib/ratingUtils"
import { Button } from "./ui/button"
import { ArrowDown } from "lucide-react"

interface ReviewSummaryProps {
  highlightFeatures?: Array<{
    title: string
    description?: string
    icon?: string
  }>
  readMoreSection?: string
  showRating?: boolean
  showDistribution?: boolean
  showGuestLikes?: boolean
  showRecentComments?: boolean
  showReadMore?: boolean
  useAIProcessing?: boolean
}

const extractCommonThemes = (texts: string[], t: any): string[] => {
  const themes = [
    {
      keywords: ["wildlife", "animals", "monkeys", "birds", "nature"],
      theme: t("wildlifeNature"),
    },
    {
      keywords: ["solar", "eco", "sustainable", "green", "environment"],
      theme: t("ecoFriendly"),
    },
    {
      keywords: ["quiet", "peaceful", "serene", "relaxing", "tranquil"],
      theme: t("peacefulSetting"),
    },
    {
      keywords: ["clean", "beautiful", "amazing", "stunning", "perfect"],
      theme: t("beautifulClean"),
    },
    {
      keywords: ["location", "access", "convenient", "close", "near"],
      theme: t("greatLocation"),
    },
    {
      keywords: ["host", "staff", "service", "helpful", "friendly"],
      theme: t("excellentService"),
    },
    {
      keywords: ["comfortable", "cozy", "bed", "amenities", "facilities"],
      theme: t("comfortable"),
    },
  ]

  const themeCounts = themes.map(({ keywords, theme }) => {
    const count = texts.filter(text =>
      keywords.some(keyword => text.includes(keyword)),
    ).length
    return { theme, count }
  })

  return themeCounts
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(({ theme }) => theme)
}

export const ReviewSummary = ({
  highlightFeatures,
  readMoreSection,
  showRating = true,
  showDistribution = true,
  showGuestLikes = true,
  showRecentComments = true,
  showReadMore = true,
  useAIProcessing = false,
}: ReviewSummaryProps) => {
  const t = useTranslations("reviews")
  const { place } = usePlace()
  const { data: sanityReviews } = useSWR(REVIEWS_QUERY, clientSideFetch)

  const stableAllReviews = React.useMemo(() => {
    return [...(place?.reviews ?? []), ...(sanityReviews ?? [])] as TReview[]
  }, [place, JSON.stringify(place?.reviews), JSON.stringify(sanityReviews)])

  const reviewsForProcessing = React.useMemo(() => {
    return stableAllReviews.map(review => ({
      text: review?.text || review?.reviewText || "",
      rating: review?.rating || 0,
      date: review?.date || new Date(),
      platform: review?.platform || "google",
    }))
  }, [stableAllReviews])

  const { data: processedData } = useSWR(
    useAIProcessing && reviewsForProcessing.length > 0
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

  const summaryStats = React.useMemo(() => {
    if (!stableAllReviews.length) return null

    const totalReviews = stableAllReviews.length
    const validRatings = stableAllReviews.filter(review => {
      const rating = review?.rating || 0
      return rating > 0
    })

    if (!validRatings.length) return null

    const normalizedRatings = validRatings.map(review =>
      normalizeRatingTo5Stars(review?.rating || 0, review.platform || "google"),
    )

    const averageRating =
      normalizedRatings.reduce((sum, rating) => sum + rating, 0) /
      normalizedRatings.length
    const roundedRating = Math.round(averageRating * 10) / 10

    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: normalizedRatings.filter(rating => rating === stars).length,
      percentage:
        (normalizedRatings.filter(rating => rating === stars).length /
          normalizedRatings.length) *
        100,
    }))

    let commonThemes: string[] = []
    if (!useAIProcessing) {
      const reviewTexts = stableAllReviews
        .filter(review => {
          const text = review?.text || review?.reviewText || ""
          return text.length > 50
        })
        .map(review => (review?.text || review?.reviewText || "").toLowerCase())
      commonThemes = extractCommonThemes(reviewTexts, t)
    }

    return {
      totalReviews,
      averageRating: roundedRating,
      ratingDistribution,
      commonThemes,
      recentReviews: stableAllReviews.slice(0, 3),
    }
  }, [stableAllReviews, useAIProcessing])

  if (!summaryStats) return null

  const renderStars = (rating: number) => {
    return Array.from({ length: rating }, (_, i) => (
      <Image
        key={i}
        src={starIcons.filled}
        alt={"Filled star"}
        width="17"
        height="17"
        loading="lazy"
      />
    ))
  }

  const hasLeftColumn = showRating || showDistribution
  const hasRightColumn =
    (showGuestLikes &&
      ((highlightFeatures && highlightFeatures.length > 0) ||
        (useAIProcessing
          ? processedAspects.length > 0 || (summaryText?.length ?? 0) > 0
          : summaryStats.commonThemes.length > 0) ||
        (showRecentComments && summaryStats.recentReviews.length > 0))) ||
    (showRecentComments && summaryStats.recentReviews.length > 0)

  if (!hasLeftColumn && !hasRightColumn) return null

  return (
    <div className="flex flex-wrap">
      <div
        className={`${hasLeftColumn && hasRightColumn ? "md:grid md:grid-cols-2" : ""} gap-4`}
      >
        {hasLeftColumn && (
          <div className="md:flex flex-wrap items-start gap-4">
            {showRating && (
              <div className="flex-1 flex flex-wrap gap-2">
                <div className="flex items-center gap-1 mb-2">
                  {renderStars(summaryStats.averageRating)}
                </div>
                <div className="text-3xl font-bold text-guarumo-primary dark:text-zinc-50">
                  {summaryStats.averageRating}
                </div>
                <p className="flex-none w-full text-sm text-gray-600 dark:text-gray-400">
                  {t("basedOnReviews", { count: summaryStats.totalReviews })}
                </p>
              </div>
            )}

            {showDistribution && (
              <div className="space-y-2 flex-3 shrink-0 mt-4 pt-4 md:ml-6 md:pl-6 md:mt-0 md:pt-0">
                {summaryStats.ratingDistribution.map(
                  ({ stars, count, percentage }) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
                        {stars}★
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {hasRightColumn && (
          <div
            className={`${hasLeftColumn ? "mt-4 pt-4 md:ml-6 md:pl-6 md:mt-0 md:pt-0" : ""}`}
          >
            {showGuestLikes && (
              <div>
                {(useAIProcessing ||
                  !!highlightFeatures?.length ||
                  summaryStats.commonThemes.length > 0) && (
                  <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    {t("whatGuestsLoveMost")}
                  </h4>
                )}

                {useAIProcessing && summaryText && (
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                    {summaryText}
                  </p>
                )}

                <div className="flex flex-wrap gap-1">
                  {highlightFeatures &&
                    highlightFeatures.length > 0 &&
                    highlightFeatures.slice(0, 4).map((feature, index) => (
                      <Badge
                        key={`feature-${index}`}
                        variant="secondary"
                        className="text-xs bg-guarumo-primary/20 text-guarumo-primary dark:text-zinc-50 border-guarumo-primary/30"
                      >
                        {feature.icon && (
                          <DynamicLucideIcon
                            icon={feature.icon}
                            className="h-3 w-3 mr-1"
                          />
                        )}
                        {feature.title}
                      </Badge>
                    ))}
                  {useAIProcessing
                    ? processedAspects
                        .slice(0, 5)
                        .map((aspect: any, index: number) => (
                          <span
                            key={`aspect-${index}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-guarumo-primary/10 text-guarumo-primary dark:bg-zinc-700 dark:text-zinc-300"
                          >
                            {aspect.aspect} ({Math.round(aspect.mentionCount)}{" "}
                            mentions)
                          </span>
                        ))
                    : summaryStats.commonThemes.map((theme, index) => (
                        <Badge
                          key={`theme-${index}`}
                          variant="secondary"
                          className="text-xs bg-guarumo-accent/20 text-guarumo-accent dark:text-zinc-50 border-guarumo-accent/30"
                        >
                          {theme}
                        </Badge>
                      ))}
                </div>
              </div>
            )}

            {showRecentComments && summaryStats.recentReviews.length > 0 && (
              <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                  {t("recentGuestComments")}
                </h4>
                <div className="space-y-2">
                  {summaryStats.recentReviews
                    .slice(0, 2)
                    .map((review, index) => {
                      const text = review?.text || review?.reviewText || ""
                      const truncatedText =
                        text.length > 150
                          ? text.substring(0, 150) + "..."
                          : text
                      const author =
                        review?.authorAttribution?.displayName ||
                        review?.author?.name ||
                        t("guest")

                      return (
                        <div
                          key={index}
                          className="text-sm text-zinc-600 dark:text-zinc-400 italic"
                        >
                          "{truncatedText}"
                          <span className="ml-2 font-normal not-italic">
                            - {author}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {readMoreSection && showReadMore && (
        <div className="w-full flex justify-center">
          <Button
            variant="outline"
            onClick={() =>
              document
                .getElementById(readMoreSection)
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="group inline-flex max-w-3xl mt-6"
          >
            {t("readMoreReviews")}
            <ArrowDown className="w-4 h-4 stroke-guarumo-primary" />
          </Button>
        </div>
      )}
    </div>
  )
}
