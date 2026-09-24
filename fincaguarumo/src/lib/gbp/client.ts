import { JWT } from 'google-auth-library'

const GBP_API_BASE = 'https://mybusiness.googleapis.com/v4'
const RATE_LIMIT_DELAY_MS = 1000
let lastRequestTime = 0

interface GBPReview {
  name: string
  reviewer: {
    profilePhotoUrl?: string
    displayName: string
    isAnonymous: boolean
  }
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
  comment: string
  createTime: string
  updateTime: string
}

interface GBPReviewsResponse {
  reviews: GBPReview[]
  nextPageToken?: string
}

interface GBPLocation {
  name: string
  title: string
  address?: {
    addressLines?: string[]
    locality?: string
    administrativeArea?: string
    postalCode?: string
    regionCode?: string
  }
  phoneNumber?: string
}

interface GBPLocationsResponse {
  locations: GBPLocation[]
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GCP_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.GCP_PROJECT_ID

  if (!email || !privateKey || !projectId) {
    throw new Error('Missing GCP service account credentials in environment variables')
  }

  const jwtClient = new JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/business.manage'],
  })

  const tokens = await jwtClient.authorize()
  if (!tokens.access_token) {
    throw new Error('Failed to obtain access token from Google')
  }
  return tokens.access_token
}

async function rateLimitedFetch<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest))
  }

  lastRequestTime = Date.now()
  return fn()
}

async function gbpFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  return rateLimitedFetch(async () => {
    const accessToken = await getAccessToken()
    const url = new URL(`${GBP_API_BASE}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await new Promise(resolve => setTimeout(resolve, delay))
      return gbpFetch<T>(endpoint, params)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GBP API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  })
}

export async function fetchLocations(): Promise<GBPLocation[]> {
  const data = await gbpFetch<GBPLocationsResponse>('/accounts/-/locations', {
    readMask: 'name,title,address,phoneNumber',
  })
  return data.locations || []
}

export async function fetchAllReviews(locationId: string): Promise<GBPReview[]> {
  const allReviews: GBPReview[] = []
  let pageToken: string | undefined
  let pageCount = 0
  const MAX_PAGES = 20

  do {
    const params: Record<string, string> = {
      pageSize: '50',
      orderBy: 'updateTime desc',
    }
    if (pageToken) {
      params.pageToken = pageToken
    }

    const data = await gbpFetch<GBPReviewsResponse>(`/${locationId}/reviews`, params)
    allReviews.push(...(data.reviews || []))
    pageToken = data.nextPageToken
    pageCount++
  } while (pageToken && pageCount < MAX_PAGES)

  return allReviews
}

export async function fetchReviewsPage(
  locationId: string,
  pageSize = 50,
  pageToken?: string
): Promise<{ reviews: GBPReview[]; nextPageToken?: string }> {
  const params: Record<string, string> = {
    pageSize: String(pageSize),
    orderBy: 'updateTime desc',
  }
  if (pageToken) {
    params.pageToken = pageToken
  }

  const data = await gbpFetch<GBPReviewsResponse>(`/${locationId}/reviews`, params)
  return {
    reviews: data.reviews || [],
    nextPageToken: data.nextPageToken,
  }
}

export function starRatingToNumber(rating: GBPReview['starRating']): number {
  const map: Record<GBPReview['starRating'], number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  }
  return map[rating] || 0
}

export function calculateAverageRating(reviews: GBPReview[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + starRatingToNumber(r.starRating), 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

export function formatReviewForClient(review: GBPReview) {
  return {
    id: review.name.split('/').pop(),
    authorName: review.reviewer.displayName,
    authorPhoto: review.reviewer.profilePhotoUrl,
    isAnonymous: review.reviewer.isAnonymous,
    rating: starRatingToNumber(review.starRating),
    text: review.comment,
    relativeTime: formatRelativeTime(review.createTime),
    createTime: review.createTime,
    updateTime: review.updateTime,
  }
}

function formatRelativeTime(isoTime: string): string {
  const date = new Date(isoTime)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffMonths / 12)

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return 'Today'
}

export type { GBPReview, GBPLocation, GBPReviewsResponse, GBPLocationsResponse }