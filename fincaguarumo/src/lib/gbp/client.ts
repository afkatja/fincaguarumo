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

/**
 * Creates a new OAuth2 client for Google Business Profile API.
 * 
 * Uses GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and
 * GOOGLE_OAUTH_REDIRECT_URI environment variables.
 * 
 * @returns A new OAuth2Client instance configured with credentials
 * @throws Error if required OAuth2 credentials are not configured
 */
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

/**
 * Creates an OAuth2 client pre-configured with access/refresh tokens.
 * 
 * Used for authenticated API calls on behalf of a human user who has
 * completed the OAuth flow. The client is ready to make authenticated
 * requests immediately.
 * 
 * @param accessToken - Current access token from OAuth flow
 * @param refreshToken - Refresh token for obtaining new access tokens
 * @param expiryDate - Unix timestamp (ms) when access token expires
 * @returns An OAuth2Client configured with the provided credentials
 */
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

/**
 * Generates the Google OAuth 2.0 authorization URL.
 * 
 * Creates the URL for the user to grant consent for GBP access.
 * Includes offline access and consent prompt for refresh token.
 * 
 * @param state - Optional CSRF protection state parameter
 * @returns The full Google OAuth authorization URL
 */
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

/**
 * Exchanges an OAuth authorization code for access/refresh tokens.
 * 
 * Exchanges the authorization code received from Google's OAuth callback
 * for access and refresh tokens.
 * 
 * @param code - The authorization code from Google's OAuth callback
 * @returns Object containing access_token, refresh_token, and expiry_date
 * @throws Error if token exchange fails
 */
export async function getTokensFromCode(code: string): Promise<OAuthTokens> {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens as OAuthTokens
}

/**
 * Obtains a valid access token for GBP API calls.
 * 
 * Supports two authentication modes:
 * - Service Account (default): Uses JWT to obtain tokens for server-to-server calls
 * - OAuth2 User: Uses OAuth2 client with refresh token for human user calls
 * 
 * Automatically refreshes expired tokens when using OAuth2 mode.
 * 
 * @param useServiceAccount - If true, uses service account JWT; if false, uses OAuth2 client
 * @param oauth2Client - Optional pre-configured OAuth2 client (for human user mode)
 * @returns A valid access token string
 * @throws Error if no valid credentials are available
 */
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

const MAX_429_RETRIES = 2
const MIN_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 60_000

/**
 * Parses the Retry-After header from a 429 response.
 * 
 * Handles both seconds-based and HTTP-date formats per RFC 7231.
 * Clamps the delay to MIN_RETRY_DELAY_MS and MAX_RETRY_DELAY_MS bounds.
 * 
 * @param header - The Retry-After header value (seconds or HTTP-date)
 * @returns Delay in milliseconds before retrying
 */
function parseRetryAfter(header: string | null): number {
  if (!header) return 5000

  const seconds = parseInt(header, 10)
  if (!Number.isNaN(seconds)) {
    return Math.max(MIN_RETRY_DELAY_MS, Math.min(seconds * 1000, MAX_RETRY_DELAY_MS))
  }

  const date = new Date(header)
  if (!Number.isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now()
    return Math.max(MIN_RETRY_DELAY_MS, Math.min(delay, MAX_RETRY_DELAY_MS))
  }

  return 5000
}

/**
 * Enforces rate limiting between API requests.
 * 
 * Ensures a minimum delay (RATE_LIMIT_DELAY_MS) between consecutive
 * API calls to avoid hitting GBP API rate limits.
 * 
 * @param fn - Async function to execute after rate limit delay
 * @returns The result of the async function
 */
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

/**
 * Makes a rate-limited request to the GBP Account Management API.
 * 
 * Handles authentication, rate limiting, retries on 429, and error handling.
 * Supports both service account and OAuth2 user authentication.
 * 
 * @param endpoint - API endpoint path (e.g., "/accounts")
 * @param params - Query parameters
 * @param method - HTTP method (GET or POST)
 * @param body - Request body for POST requests
 * @param useServiceAccount - Whether to use service account auth
 * @param oauth2Client - Optional OAuth2 client for user auth
 * @param retryCount - Internal retry counter for 429 retries
 * @returns Parsed JSON response
 * @throws Error on API errors or max retries exceeded
 */
async function accountApiFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
  retryCount = 0,
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
      if (retryCount >= MAX_429_RETRIES) {
        const errorText = await response.text()
        throw new Error(
          `GBP Account API error: ${response.status} ${response.statusText} - ${errorText} (max retries exceeded)`,
        )
      }
      const delay = parseRetryAfter(response.headers.get("Retry-After"))
      await new Promise(resolve => setTimeout(resolve, delay))
      return accountApiFetch<T>(
        endpoint,
        params,
        method,
        body,
        useServiceAccount,
        oauth2Client,
        retryCount + 1,
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

/**
 * Makes a rate-limited request to the GBP Business Information API (locations).
 * 
 * Handles authentication, rate limiting, retries on 429, and error handling.
 * Used for fetching location details.
 * 
 * @param endpoint - API endpoint path (e.g., "/accounts/{id}/locations")
 * @param params - Query parameters
 * @param useServiceAccount - Whether to use service account auth
 * @param oauth2Client - Optional OAuth2 client for user auth
 * @param retryCount - Internal retry counter for 429 retries
 * @returns Parsed JSON response
 * @throws Error on API errors or max retries exceeded
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function locationApiFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
  retryCount = 0,
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
      if (retryCount >= MAX_429_RETRIES) {
        const errorText = await response.text()
        throw new Error(
          `GBP Location API error: ${response.status} ${response.statusText} - ${errorText} (max retries exceeded)`,
        )
      }
      const delay = parseRetryAfter(response.headers.get("Retry-After"))
      await new Promise(resolve => setTimeout(resolve, delay))
      return locationApiFetch<T>(endpoint, params, useServiceAccount, oauth2Client, retryCount + 1)
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

/**
 * Makes a rate-limited request to the GBP Reviews API (v4).
 * 
 * Handles authentication, rate limiting, retries on 429, and error handling.
 * Used for fetching reviews for a specific location.
 * 
 * @param endpoint - API endpoint path (e.g., "/accounts/{id}/locations/{id}/reviews")
 * @param params - Query parameters
 * @param useServiceAccount - Whether to use service account auth
 * @param oauth2Client - Optional OAuth2 client for user auth
 * @param retryCount - Internal retry counter for 429 retries
 * @returns Parsed JSON response with reviews array and nextPageToken
 * @throws Error on API errors or max retries exceeded
 */
async function reviewsApiFetch<T>(
  endpoint: string,
  params?: Record<string, string>,
  useServiceAccount = true,
  oauth2Client?: OAuth2Client,
  retryCount = 0,
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
      if (retryCount >= MAX_429_RETRIES) {
        const errorText = await response.text()
        throw new Error(
          `GBP Reviews API error: ${response.status} ${response.statusText} - ${errorText} (max retries exceeded)`,
        )
      }
      const delay = parseRetryAfter(response.headers.get("Retry-After"))
      await new Promise(resolve => setTimeout(resolve, delay))
      return reviewsApiFetch<T>(endpoint, params, useServiceAccount, oauth2Client, retryCount + 1)
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

/**
 * Normalizes a GBP Location object to a simplified format.
 * 
 * Extracts and formats the relevant fields from the raw GBP location
 * response into a simpler, more usable structure.
 * 
 * @param loc - Raw GBP Location object from API
 * @returns Normalized location with name, title, formatted address, and phone
 */
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

/**
 * Retrieves the GBP account ID for the authenticated user.
 * 
 * Fetches the list of accounts accessible to the authenticated user
 * and returns the first account's ID (without the "accounts/" prefix).
 * 
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns The GBP account ID (numeric string)
 * @throws Error if no accounts are found
 */
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

/**
 * Lists all GBP accounts accessible to the authenticated user.
 * 
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns Array of GBP accounts with name, accountName, type, and state
 */
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

/**
 * Lists all pending invitations for the authenticated GBP account.
 * 
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns Array of pending invitations with role, state, and target location info
 */
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

/**
 * Accepts a pending GBP location invitation.
 * 
 * @param invitationName - Full resource name of the invitation (e.g., "accounts/123/invitations/456")
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns Promise that resolves when invitation is accepted
 * @throws Error if invitation acceptance fails
 */
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

/**
 * Fetches all locations for the authenticated GBP account.
 * 
 * Retrieves and normalizes all locations (business profiles) associated
 * with the authenticated account.
 * 
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns Array of normalized locations with name, title, address, and phone
 */
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

/**
 * Fetches all reviews for a specific GBP location.
 * 
 * Iterates through all pages of reviews (up to MAX_PAGES) and returns
 * a combined array. Reviews are ordered by updateTime descending (newest first).
 * 
 * @param locationId - Full GBP location resource name (e.g., "accounts/123/locations/456")
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns Array of all GBP reviews for the location
 */
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

/**
 * Fetches a single page of reviews for a GBP location.
 * 
 * Returns a page of reviews with pagination token for the next page.
 * Reviews are ordered by updateTime descending (newest first).
 * 
 * @param locationId - Full GBP location resource name (e.g., "accounts/123/locations/456")
 * @param pageSize - Number of reviews per page (default 50, max 50)
 * @param pageToken - Pagination token for next page
 * @param useServiceAccount - Whether to use service account authentication
 * @param oauth2Client - Optional OAuth2 client for user authentication
 * @returns Object with reviews array and optional nextPageToken
 */
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

/**
 * Converts a GBP star rating enum to a numeric value.
 * 
 * @param rating - GBP star rating enum (ONE through FIVE)
 * @returns Numeric rating (1-5), or 0 if unknown
 */
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

/**
 * Calculates the average rating from an array of GBP reviews.
 * 
 * Converts star ratings to numeric values and computes the average,
 * rounded to one decimal place.
 * 
 * @param reviews - Array of GBP reviews
 * @returns Average rating rounded to 1 decimal place, or 0 if empty
 */
export function calculateAverageRating(reviews: GBPReview[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce(
    (acc, r) => acc + starRatingToNumber(r.starRating),
    0,
  )
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Transforms a raw GBP review into a client-friendly format.
 * 
 * Extracts and normalizes fields for frontend display:
 * - Generates short ID from review resource name
 * - Converts star rating to numeric value
 * - Formats relative time string from createTime
 * - Handles anonymous reviewers
 * 
 * @param review - Raw GBP review from API
 * @returns Formatted review object for frontend display
 */
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

/**
 * Formats an ISO timestamp into a human-readable relative time string.
 * 
 * Converts timestamps like "2024-01-15T10:30:00Z" into
 * human-readable strings like "2 days ago", "3 months ago", etc.
 * 
 * @param isoTime - ISO 8601 timestamp string
 * @returns Human-readable relative time (e.g., "2 days ago", "1 year ago")
 */
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
