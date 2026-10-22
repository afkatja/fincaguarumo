import { NextRequest, NextResponse } from "next/server"
import {
  fetchAllReviews,
  fetchReviewsPage,
  formatReviewForClient,
} from "@/lib/gbp/client"

export const revalidate = 3600

const LOCATION_ID_PATTERN = /^accounts\/\d+\/locations\/\d+$/
const MAX_PAGE_SIZE = 50
const MIN_PAGE_SIZE = 1

/**
 * Validates and normalizes a GBP location ID.
 *
 * Accepts location IDs in the format `accounts/{accountId}/locations/{locationId}`.
 * If the provided ID doesn't match the pattern, falls back to the configured
 * GBP_LOCATION_ID environment variable.
 *
 * @param locationId - The location ID to validate
 * @returns The validated location ID in the correct format
 * @throws Error if the location ID format is invalid and no valid fallback is configured
 */
function validateLocationId(locationId: string): string {
  if (LOCATION_ID_PATTERN.test(locationId)) {
    return locationId
  }
  const configuredLocationId = process.env.GBP_LOCATION_ID
  if (configuredLocationId && LOCATION_ID_PATTERN.test(configuredLocationId)) {
    return configuredLocationId
  }
  throw new Error(
    "Invalid locationId format. Expected: accounts/{accountId}/locations/{locationId}",
  )
}

/**
 * Clamps a page size value to the allowed range.
 *
 * Ensures the page size is between MIN_PAGE_SIZE and MAX_PAGE_SIZE.
 *
 * @param pageSize - The requested page size
 * @returns The clamped page size within [MIN_PAGE_SIZE, MAX_PAGE_SIZE]
 */
function clampPageSize(pageSize: number): number {
  return Math.min(Math.max(pageSize, MIN_PAGE_SIZE), MAX_PAGE_SIZE)
}

/**
 * Fetches GBP reviews for a specific location with pagination support.
 *
 * Supports both full review fetch (`all=true`) and paginated results.
 * Uses OAuth2 credentials for authenticated access to GBP API.
 * Results are cached with 1-hour TTL and cache tags for targeted revalidation.
 *
 * Query parameters:
 * - locationId: GBP location ID (format: accounts/{accountId}/locations/{locationId})
 * - pageSize: Number of reviews per page (1-50, default 50)
 * - pageToken: Pagination token for next page
 * - all: If "true", fetches all reviews (bypasses pagination)
 *
 * @param request - The incoming NextRequest with query parameters
 * @returns JSON response with reviews array, nextPageToken, and cache tags
 * @throws 400 if locationId is missing or invalid
 * @throws 401/403/404/429/500 for various API errors
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawLocationId = searchParams.get("locationId")
    const pageSize = clampPageSize(
      parseInt(searchParams.get("pageSize") || "50", 10),
    )
    const pageToken = searchParams.get("pageToken") || undefined
    const all = searchParams.get("all") === "true"

    if (!rawLocationId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "locationId is required" } },
        { status: 400 },
      )
    }

    let locationId: string
    try {
      locationId = validateLocationId(rawLocationId)
    } catch {
      return NextResponse.json(
        {
          error: { code: "BAD_REQUEST", message: "Invalid locationId format" },
        },
        { status: 400 },
      )
    }

    const locationCacheKey = locationId.replace(/\//g, "-")

    let reviews: Awaited<ReturnType<typeof fetchAllReviews>>
    let nextPageToken: string | undefined

    if (all) {
      reviews = await fetchAllReviews(locationId, true)
    } else {
      const result = await fetchReviewsPage(
        locationId,
        pageSize,
        pageToken,
        false,
      )
      reviews = result.reviews
      nextPageToken = result.nextPageToken
    }

    const formattedReviews = reviews.map(formatReviewForClient)

    // Create cache tags for targeted revalidation
    const reviewCacheTag = `gbp-reviews-${locationCacheKey}`
    const locationsCacheTag = "gbp-locations"

    return NextResponse.json(
      { reviews: formattedReviews, nextPageToken },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
          "X-Cache-Tags": `${reviewCacheTag},${locationsCacheTag}`,
        },
      },
    )
  } catch (error) {
    console.error("GBP reviews error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"

    let code = "INTERNAL_ERROR"
    let status = 500

    if (message.includes("401") || message.includes("403")) {
      code = "UNAUTHORIZED"
      status = 401
    } else if (message.includes("404")) {
      code = "NOT_FOUND"
      status = 404
    } else if (message.includes("429")) {
      code = "RATE_LIMITED"
      status = 429
    }

    return NextResponse.json({ error: { code, message } }, { status })
  }
}
