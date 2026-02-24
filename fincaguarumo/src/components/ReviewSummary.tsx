"use client"
import React from "react"
import { usePlace } from "../app/providers/PlaceProvider"
import { TReview } from "../types"
import { shuffle } from "../lib/utils"
import Title from "./Title"
import useSWR from "swr"
import { REVIEWS_QUERY } from "../sanity/lib/queries"
import { clientSideFetch } from "../sanity/lib/clientSide"
import Icon from "./Icon"
import { Badge } from "./ui/badge"
import { useTranslations } from "next-intl"

interface ReviewSummaryProps {
  count?: number
}

export const ReviewSummary = ({ count }: ReviewSummaryProps) => {
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

    const totalReviews = stableAllReviews.length
    const validRatings = stableAllReviews.filter(review => {
      const rating = review?.rating || 0
      return rating > 0
    })

    if (!validRatings.length) return null

    // Normalize ratings (Booking.com uses 1-10 scale)
    const normalizedRatings = validRatings.map(review => {
      const platform = review.platform || "google"
      const rating = review?.rating || 0
      return platform === "booking" ? Math.ceil(rating / 2) : rating
    })

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

    const commonThemes = extractCommonThemes(reviewTexts)

    return {
      totalReviews,
      averageRating: roundedRating,
      ratingDistribution,
      commonThemes,
      recentReviews: stableAllReviews.slice(0, 3),
    }
  }, [stableAllReviews])

  // Extract common themes from review texts
  const extractCommonThemes = (texts: string[]): string[] => {
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

  if (!summaryStats) return null

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        icon={i < Math.floor(rating) ? "Star" : "Star"}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        color="currentColor"
      />
    ))
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Overall Rating */}
        <div className="shrink-0 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-1 mb-2">
            {renderStars(summaryStats.averageRating)}
          </div>
          <div className="text-3xl font-bold text-guarumo-primary dark:text-zinc-50">
            {summaryStats.averageRating}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("basedOnReviews", { count: summaryStats.totalReviews }) ||
              `Based on ${summaryStats.totalReviews} reviews`}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1">
          <div className="space-y-2">
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

        {/* Common Themes */}
        <div className="shrink-0">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t("whatGuestsLoveMost") || "What guests love most"}
          </h4>
          <div className="flex flex-wrap gap-1">
            {summaryStats.commonThemes.map((theme, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs bg-guarumo-accent/20 text-guarumo-primary dark:text-zinc-50 border-guarumo-accent/30"
              >
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Review Snippets */}
      {summaryStats.recentReviews.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
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
                  className="text-sm text-gray-600 dark:text-gray-400 italic"
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
  )
}
