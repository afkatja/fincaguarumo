"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { TReview } from "@/types"

type ReviewsContextType = {
  reviews: TReview[]
  loading: boolean
  error: string | null
  averageRating: number
  totalReviews: number
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined)

type ReviewsProviderProps = {
  locationId?: string
  pageSize?: number
  children: ReactNode
}

function normalizeGBPReview(review: {
  id: string
  authorName: string
  authorPhoto?: string
  isAnonymous: boolean
  rating: number
  text: string
  relativeTime: string
  createTime: string
  updateTime: string
}): TReview {
  return {
    authorAttribution: {
      displayName: review.isAnonymous ? "Anonymous" : review.authorName,
      photoURI: review.authorPhoto || "",
    },
    publishTime: new Date(review.createTime),
    rating: review.rating,
    text: review.text,
    author: {
      displayName: review.isAnonymous ? "Anonymous" : review.authorName,
      photoURI: review.authorPhoto,
    },
    date: review.createTime,
    reviewText: review.text,
    platform: "google",
    photoUrl: review.authorPhoto,
  }
}

export const ReviewsProvider: React.FC<ReviewsProviderProps> = ({
  locationId = process.env.NEXT_PUBLIC_GBP_LOCATION_ID,
  pageSize = 8,
  children,
}) => {
  const [reviews, setReviews] = useState<TReview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchReviews = async (append = false) => {
    if (!locationId) {
      setError("GBP_LOCATION_ID not configured")
      setLoading(false)
      return
    }

    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        locationId,
        pageSize: String(pageSize),
      })
      if (append && nextPageToken) {
        params.set("pageToken", nextPageToken)
      }

      const response = await fetch(`/api/gbp/reviews?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || "Failed to fetch reviews")
      }

      const data = await response.json()
      const normalizedReviews = (data.reviews || []).map(normalizeGBPReview)

      if (append) {
        setReviews((prev) => [...prev, ...normalizedReviews])
      } else {
        setReviews(normalizedReviews)
      }

      setNextPageToken(data.nextPageToken || null)
      setHasMore(!!data.nextPageToken)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch reviews"
      setError(message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    await fetchReviews(true)
  }

  useEffect(() => {
    fetchReviews(false)
  }, [locationId])

  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
    : 0

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        loading,
        loadingMore,
        error,
        averageRating,
        totalReviews: reviews.length,
        hasMore,
        loadMore,
        refetch: () => fetchReviews(false),
      }}
    >
      {children}
    </ReviewsContext.Provider>
  )
}

export const useReviews = (): ReviewsContextType => {
  const context = useContext(ReviewsContext)

  if (context === undefined) {
    throw new Error("useReviews must be used within a ReviewsProvider")
  }
  return context
}