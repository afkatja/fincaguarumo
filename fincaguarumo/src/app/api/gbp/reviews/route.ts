import { NextRequest, NextResponse } from 'next/server'
import { fetchAllReviews, fetchReviewsPage, formatReviewForClient } from '@/lib/gbp/client'

export const revalidate = 3600

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const pageToken = searchParams.get('pageToken') || undefined
    const all = searchParams.get('all') === 'true'

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'locationId is required' } },
        { status: 400 }
      )
    }

    let reviews: Awaited<ReturnType<typeof fetchAllReviews>>
    let nextPageToken: string | undefined

    if (all) {
      reviews = await fetchAllReviews(locationId)
    } else {
      const result = await fetchReviewsPage(locationId, pageSize, pageToken)
      reviews = result.reviews
      nextPageToken = result.nextPageToken
    }

    const formattedReviews = reviews.map(formatReviewForClient)

    return NextResponse.json(
      { reviews: formattedReviews, nextPageToken },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('GBP reviews error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    let code = 'INTERNAL_ERROR'
    let status = 500

    if (message.includes('401') || message.includes('403')) {
      code = 'UNAUTHORIZED'
      status = 401
    } else if (message.includes('404')) {
      code = 'NOT_FOUND'
      status = 404
    } else if (message.includes('429')) {
      code = 'RATE_LIMITED'
      status = 429
    }

    return NextResponse.json(
      { error: { code, message } },
      { status }
    )
  }
}