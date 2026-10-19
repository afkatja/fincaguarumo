import { JWT, OAuth2Client } from "google-auth-library"
import "dotenv/config"

const ACCOUNT_API_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1"
const LOCATION_API_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1"
const REVIEWS_API_BASE = "https://mybusiness.googleapis.com/v4"
const RATE_LIMIT_DELAY_MS = 1000
const OAUTH2_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
]

let lastRequestTime = 0

// Service Account (for ongoing review fetching - production)
let serviceAccountJWT: JWT | null = null

function getServiceAccountJWT(): JWT {
  if (serviceAccountJWT) return serviceAccountJWT

  const email = process.env.GCP_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!email || !privateKey) {
    throw new Error("Missing GCP service account credentials")
  }

  serviceAccountJWT = new JWT({
    email,
    key: privateKey,
    scopes: OAUTH2_SCOPES,
  })

  return serviceAccountJWT
}

function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "https://localhost:3000/api/auth/google/callback"

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth2 credentials (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET)",
    )
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri)
}

export function createAuthenticatedOAuth2Client(
  accessToken: string,
  refreshToken: string,
  expiryDate: number,
): OAuth2Client {
  const client = createOAuth2Client()
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate,
  })
  return client
}

export function getAuthUrl(state?: string): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: "offline",
    scope: OAUTH2_SCOPES,
    state,
    prompt: "consent",
  })
}

interface OAuthTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
}

export async function getTokensFromCode(code: string): Promise<OAuthTokens> {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens as OAuthTokens
}

async function getValidAccessToken(
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<string> {
  if (useServiceAccount) {
    const jwt = getServiceAccountJWT()
    const tokens = await jwt.authorize()
    if (!tokens.access_token)
      throw new Error("Failed to get service account token")
    return tokens.access_token
  }

  // Use OAuth2 client (human owner)
  const client = oauth2Client ?? createOAuth2Client()

  // If no explicit client provided, try to initialize with stored refresh token
  if (!oauth2Client) {
    const refreshToken = process.env.GBP_OAUTH_REFRESH_TOKEN
    if (refreshToken) {
      client.setCredentials({ refresh_token: refreshToken })
    }
  }

  if (!client.credentials.refresh_token) {
    throw new Error(
      "OAuth2 refresh token not configured. Set GBP_OAUTH_REFRESH_TOKEN or run auth flow.",
    )
  }

  // Auto-refresh if needed
  const isExpired =
    client.credentials.expiry_date &&
    Date.now() >= client.credentials.expiry_date
  if (isExpired || !client.credentials.access_token) {
    const { credentials } = await client.refreshAccessToken()
    client.setCredentials(credentials)
  }

  return client.credentials.access_token!
}

async function rateLimitedFetch<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest),
    )
  }

  lastRequestTime = Date.now()
  return fn()
}

async function accountApiFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<T> {
  return rateLimitedFetch(async () => {
    const accessToken = await getValidAccessToken(useServiceAccount, oauth2Client)
    const url = new URL(`${ACCOUNT_API_BASE}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      )
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
    if (body && method === "POST") {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url.toString(), fetchOptions)

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After")
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await new Promise(resolve => setTimeout(resolve, delay))
      return accountApiFetch<T>(
        endpoint,
        params,
        method,
        body,
        useServiceAccount,
        oauth2Client,
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `GBP Account API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  })
}

async function locationApiFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<T> {
  return rateLimitedFetch(async () => {
    const accessToken = await getValidAccessToken(useServiceAccount, oauth2Client)
    const url = new URL(`${LOCATION_API_BASE}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      )
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After")
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await new Promise(resolve => setTimeout(resolve, delay))
      return locationApiFetch<T>(endpoint, params, useServiceAccount, oauth2Client)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `GBP Location API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    return response.json()
  })
}

async function reviewsApiFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<T> {
  return rateLimitedFetch(async () => {
    const accessToken = await getValidAccessToken(useServiceAccount, oauth2Client)
    const url = new URL(`${REVIEWS_API_BASE}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      )
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After")
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await new Promise(resolve => setTimeout(resolve, delay))
      return reviewsApiFetch<T>(endpoint, params, useServiceAccount, oauth2Client)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `GBP Reviews API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    return response.json()
  })
}

// Types
interface GBPReview {
  name: string
  reviewer: {
    profilePhotoUrl?: string
    displayName: string
    isAnonymous: boolean
  }
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE"
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
  storefrontAddress?: {
    addressLines?: string[]
    locality?: string
    administrativeArea?: string
    postalCode?: string
    regionCode?: string
  }
  phoneNumbers?: {
    primaryPhone?: string
  }
}

function normalizeLocation(loc: GBPLocation) {
  return {
    name: loc.name,
    title: loc.title,
    address: loc.storefrontAddress
      ? [
          ...(loc.storefrontAddress.addressLines || []),
          loc.storefrontAddress.locality,
          loc.storefrontAddress.administrativeArea,
          loc.storefrontAddress.postalCode,
          loc.storefrontAddress.regionCode,
        ]
          .filter(Boolean)
          .join(", ")
      : undefined,
    phoneNumber: loc.phoneNumbers?.primaryPhone,
  }
}

interface GBPLocationsResponse {
  locations: GBPLocation[]
}

interface GBPAccount {
  name: string
  accountName: string
  type: string
  state: string
  verificationState?: string
  vettedState?: string
}

interface GBPAccountsResponse {
  accounts: GBPAccount[]
}

interface GBPInvitation {
  name: string
  accountId: string
  emailAddress: string
  role: string
  state: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  targetLocation?: {
    locationName: string
    address: string
    placeId: string
  }
  [key: string]: unknown
}

interface GBPInvitationsResponse {
  invitations: GBPInvitation[]
}

export async function getAccountId(
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<string> {
  const data = await accountApiFetch<GBPAccountsResponse>(
    "/accounts",
    undefined,
    "GET",
    undefined,
    useServiceAccount,
    oauth2Client,
  )
  const accounts = data.accounts || []

  if (accounts.length === 0) {
    throw new Error("No GBP accounts found")
  }

  return accounts[0].name.replace("accounts/", "")
}

export async function listAccounts(
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<GBPAccount[]> {
  const data = await accountApiFetch<GBPAccountsResponse>(
    "/accounts",
    undefined,
    "GET",
    undefined,
    useServiceAccount,
    oauth2Client,
  )
  return data.accounts || []
}

export async function listInvitations(
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<GBPInvitation[]> {
  const accountId = await getAccountId(useServiceAccount, oauth2Client)
  const data = await accountApiFetch<GBPInvitationsResponse>(
    `/accounts/${accountId}/invitations`,
    undefined,
    "GET",
    undefined,
    useServiceAccount,
    oauth2Client,
  )
  return data.invitations || []
}

export async function acceptInvitation(
  invitationName: string,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<void> {
  await accountApiFetch(
    `/${invitationName}:accept`,
    {},
    "POST",
    {},
    useServiceAccount,
    oauth2Client,
  )
}

export async function fetchLocations(
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<ReturnType<typeof normalizeLocation>[]> {
  const accountId = await getAccountId(useServiceAccount, oauth2Client)
  const data = await accountApiFetch<GBPLocationsResponse>(
    `/accounts/${accountId}/locations`,
    {
      readMask: "name,title,storefrontAddress,phoneNumbers",
    },
    "GET",
    undefined,
    useServiceAccount,
    oauth2Client,
  )
  return (data.locations || []).map(normalizeLocation)
}

export async function fetchAllReviews(
  locationId: string,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<GBPReview[]> {
  const allReviews: GBPReview[] = []
  let pageToken: string | undefined
  let pageCount = 0
  const MAX_PAGES = 20

  do {
    const params: Record<string, string> = {
      pageSize: "50",
      orderBy: "updateTime desc",
    }
    if (pageToken) {
      params.pageToken = pageToken
    }

    const data = await reviewsApiFetch<GBPReviewsResponse>(
      `/${locationId}/reviews`,
      params,
      useServiceAccount,
      oauth2Client,
    )
    allReviews.push(...(data.reviews || []))
    pageToken = data.nextPageToken
    pageCount++
  } while (pageToken && pageCount < MAX_PAGES)

  return allReviews
}

export async function fetchReviewsPage(
  locationId: string,
  pageSize = 50,
  pageToken?: string,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
): Promise<{ reviews: GBPReview[]; nextPageToken?: string }> {
  const params: Record<string, string> = {
    pageSize: String(pageSize),
    orderBy: "updateTime desc",
  }
  if (pageToken) {
    params.pageToken = pageToken
  }

  const data = await reviewsApiFetch<GBPReviewsResponse>(
    `/${locationId}/reviews`,
    params,
    useServiceAccount,
    oauth2Client,
  )
  return {
    reviews: data.reviews || [],
    nextPageToken: data.nextPageToken,
  }
}

export function starRatingToNumber(rating: GBPReview["starRating"]): number {
  const map: Record<GBPReview["starRating"], number> = {
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
  const sum = reviews.reduce(
    (acc, r) => acc + starRatingToNumber(r.starRating),
    0,
  )
  return Math.round((sum / reviews.length) * 10) / 10
}

export function formatReviewForClient(review: GBPReview) {
  return {
    id: review.name.split("/").pop(),
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

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`
  if (diffMonths > 0)
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  return "Today"
}

export type { GBPReview, GBPLocation, GBPReviewsResponse, GBPLocationsResponse }
