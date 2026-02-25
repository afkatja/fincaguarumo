"use client"
import React from "react"
import { usePlace } from "../app/providers/PlaceProvider"
import Image from "next/image"
import { TReview } from "../types"
import { shuffle } from "../lib/utils"
import Title from "./Title"
import useSWR from "swr"
import { REVIEWS_QUERY } from "../sanity/lib/queries"
import { clientSideFetch } from "../sanity/lib/clientSide"
import Icon from "./Icon"
import { Badge } from "./ui/badge"
import { useTranslations } from "next-intl"
import { starIcons } from "./Review"
import { DynamicLucideIcon } from "./DynamicLucideIcon"
import { normalizeRatingTo5Stars } from "../lib/ratingUtils"

interface ReviewSummaryProps {
  count?: number
  highlightFeatures?: Array<{
    title: string
    description?: string
    icon?: string
  }>
}

// Extract common themes from review texts
const extractCommonThemes = (texts: string[], t: any): string[] => {
  const themes = [
    {
      keywords: ["wildlife", "animals", "monkeys", "birds", "nature"],
      theme: t("wildlifeNature") || "Wildlife & Nature",
    },
    {
      keywords: ["solar", "eco", "sustainable", "green", "environment"],
      theme: t("ecoFriendly") || "Eco-Friendly",
    },
    {
      keywords: ["quiet", "peaceful", "serene", "relaxing", "tranquil"],
      theme: t("peacefulSetting") || "Peaceful Setting",
    },
    {
      keywords: ["clean", "beautiful", "amazing", "stunning", "perfect"],
      theme: t("beautifulClean") || "Beautiful & Clean",
    },
    {
      keywords: ["location", "access", "convenient", "close", "near"],
      theme: t("greatLocation") || "Great Location",
    },
    {
      keywords: ["host", "staff", "service", "helpful", "friendly"],
      theme: t("excellentService") || "Excellent Service",
    },
    {
      keywords: ["comfortable", "cozy", "bed", "amenities", "facilities"],
      theme: t("comfortable") || "Comfortable",
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
  count,
  highlightFeatures,
}: ReviewSummaryProps) => {
  const t = useTranslations("reviews")
  const { place } = usePlace()
  const { data: sanityReviews } = useSWR(REVIEWS_QUERY, clientSideFetch)

  // Compute stable review array
  const stableAllReviews = React.useMemo(() => {
    if (!place) return []
    return [...(place.reviews ?? []), ...(sanityReviews ?? [])] as TReview[]
  }, [place, JSON.stringify(place?.reviews), JSON.stringify(sanityReviews)])

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (!stableAllReviews.length) return null
    console.log({ place, stableAllReviews })

    const totalReviews = stableAllReviews.length
    const validRatings = stableAllReviews.filter(review => {
      const rating = review?.rating || 0
      return rating > 0
    })

    if (!validRatings.length) return null

    // Normalize all ratings to 5-star scale
    const normalizedRatings = validRatings.map(review =>
      normalizeRatingTo5Stars(review?.rating || 0, review.platform || "google"),
    )

    const averageRating =
      normalizedRatings.reduce((sum, rating) => sum + rating, 0) /
      normalizedRatings.length
    const roundedRating = Math.round(averageRating * 10) / 10

    // Count ratings by star level
    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: normalizedRatings.filter(rating => rating === stars).length,
      percentage:
        (normalizedRatings.filter(rating => rating === stars).length /
          normalizedRatings.length) *
        100,
    }))

    // Extract common themes from review texts
    const reviewTexts = stableAllReviews
      .filter(review => {
        const text = review?.text || review?.reviewText || ""
        return text.length > 50
      })
      .map(review => (review?.text || review?.reviewText || "").toLowerCase())

    const commonThemes = extractCommonThemes(reviewTexts, t)

    return {
      totalReviews,
      averageRating: roundedRating,
      ratingDistribution,
      commonThemes,
      recentReviews: stableAllReviews.slice(0, 3),
    }
  }, [stableAllReviews])

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

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6 lg:grid lg:grid-cols-2 gap-4">
      <div className="md:flex flex-wrap items-start gap-4">
        {/* Overall Rating */}
        <div className="flex-1 flex flex-wrap gap-2">
          <div className="flex items-center gap-1 mb-2">
            {renderStars(summaryStats.averageRating)}
          </div>
          <div className="text-3xl font-bold text-guarumo-primary dark:text-zinc-50">
            {summaryStats.averageRating}
          </div>
          <p className="flex-none w-full text-sm text-gray-600 dark:text-gray-400">
            {t("basedOnReviews", { count: summaryStats.totalReviews }) ||
              `Based on ${summaryStats.totalReviews} reviews`}
          </p>
        </div>

        {/* Rating Distribution */}
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
      </div>
      <div className="md:border-l border-zinc-200 dark:border-zinc-700 mt-4 pt-4 md:ml-6 md:pl-6 md:mt-0 md:pt-0">
        {/* Combined Features & Themes */}
        <div>
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            {t("whatGuestsLoveMost") || "What guests love most"}
          </h4>
          <div className="flex flex-wrap gap-1">
            {/* Static highlight features with icons */}
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
            {/* Dynamic common themes from reviews */}
            {summaryStats.commonThemes.map((theme, index) => (
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

        {/* Recent Review Snippets */}
        {summaryStats.recentReviews.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              {t("recentGuestComments") || "Recent guest comments"}
            </h4>
            <div className="space-y-2">
              {summaryStats.recentReviews.slice(0, 2).map((review, index) => {
                const text = review?.text || review?.reviewText || ""
                const truncatedText =
                  text.length > 150 ? text.substring(0, 150) + "..." : text
                const author =
                  review?.authorAttribution?.displayName ||
                  review?.author?.name ||
                  t("guest") ||
                  "Guest"

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
    </div>
  )
}
