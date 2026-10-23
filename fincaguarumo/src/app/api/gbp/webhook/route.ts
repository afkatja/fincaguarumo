import { NextRequest, NextResponse } from "next/server"
import { revalidateTag, revalidatePath } from "next/cache"
import { OAuth2Client } from "google-auth-library"

export const revalidate = 0

const GBP_PUSH_SERVICE_ACCOUNT = "mybusiness-api-pubsub@system.gserviceaccount.com"
const WEBHOOK_AUDIENCE = process.env.GBP_WEBHOOK_AUDIENCE || `${process.env.NEXT_PUBLIC_SITE_URL || "https://fincaguarumo.com"}/api/gbp/webhook`
const WEBHOOK_VERIFICATION_TOKEN = process.env.GBP_WEBHOOK_VERIFICATION_TOKEN

const oauth2Client = new OAuth2Client()

/**
 * Verifies a Google OIDC ID token for GBP webhook authentication.
 * 
 * Validates that the token:
 * - Is a valid OIDC token signed by Google
 * - Has the correct audience (this webhook's URL)
 * - Was issued by Google (accounts.google.com or https://accounts.google.com)
 * - Was issued by the GBP push service account
 * 
 * @param token - The OIDC ID token from the Authorization header
 * @returns True if the token is valid and from the expected GBP service account
 */
async function verifyOIDCToken(token: string): Promise<boolean> {
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: WEBHOOK_AUDIENCE,
    })
    const payload = ticket.getPayload()
    if (!payload) return false

    // Verify issuer is Google
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
      console.warn("Invalid OIDC token issuer:", payload.iss)
      return false
    }

    // Verify the service account email (GBP uses this service account)
    if (payload.email !== GBP_PUSH_SERVICE_ACCOUNT) {
      console.warn("Invalid OIDC token email:", payload.email)
      return false
    }

    return true
  } catch (err) {
    console.warn("OIDC token verification failed:", err)
    return false
  }
}

/**
 * Verifies a shared secret token for webhook authentication.
 * 
 * Checks for the shared secret token in:
 * 1. Query parameter `token` (for Pub/Sub push URLs with embedded token)
 * 2. Custom header `x-gbp-webhook-token`
 * 
 * @param request - The incoming NextRequest
 * @returns True if the shared secret token matches
 */
function verifySharedSecret(request: NextRequest): boolean {
  if (!WEBHOOK_VERIFICATION_TOKEN) return false

  // Check query parameter (Pub/Sub can embed token in push URL)
  const urlToken = request.nextUrl.searchParams.get("token")
  if (urlToken && urlToken === WEBHOOK_VERIFICATION_TOKEN) return true

  // Check custom header
  const headerToken = request.headers.get("x-gbp-webhook-token")
  if (headerToken && headerToken === WEBHOOK_VERIFICATION_TOKEN) return true

  return false
}

/**
 * Authenticates an incoming GBP webhook request.
 * 
 * Tries authentication methods in order:
 * 1. OIDC Bearer token (preferred) - validates Google-issued ID token
 * 2. Shared secret token - fallback for environments without OIDC support
 * 
 * @param request - The incoming NextRequest
 * @returns True if authentication succeeds, false otherwise
 */
async function authenticateRequest(request: NextRequest): Promise<boolean> {
  // Try OIDC token first (recommended)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    if (await verifyOIDCToken(token)) return true
  }

  // Fallback to shared secret
  if (verifySharedSecret(request)) return true

  return false
}

/**
 * Handles incoming GBP webhook notifications for review changes.
 * 
 * Receives Pub/Sub push notifications from Google Business Profile API
 * when reviews are created, updated, or deleted. Authenticates the request,
 * invalidates relevant caches, and optionally pre-warms the review cache.
 * 
 * Supported notification types:
 * - NEW_REVIEW: A new review was posted
 * - UPDATED_REVIEW: An existing review was modified
 * - DELETED_REVIEW: A review was deleted
 * 
 * @param request - The incoming NextRequest with Pub/Sub message body
 * @returns JSON with success status and invalidated cache tags
 * @returns 401 if authentication fails, 400 for invalid message format, 500 for server errors
 */
export async function POST(request: NextRequest) {
  // Authenticate the request
  if (!(await authenticateRequest(request))) {
    console.warn("GBP webhook authentication failed")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Verify this is a valid GBP notification
    if (!body.message?.attributes) {
      console.warn("Invalid GBP webhook message format:", body)
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 })
    }

    const message = body.message
    const locationName = message.attributes.locationName
    const notificationType = message.attributes.notificationType

    if (!locationName || !notificationType) {
      console.warn("Missing required attributes in GBP webhook:", message.attributes)
      return NextResponse.json({ error: "Missing required attributes" }, { status: 400 })
    }

    // Invalidate cache for this location's reviews
    const reviewCacheTag = `gbp-reviews-${locationName.replace(/\//g, "-")}`
    const locationsCacheTag = "gbp-locations"

    revalidateTag(reviewCacheTag, "gbp-webhook")
    revalidateTag(locationsCacheTag, "gbp-webhook")

    // Also invalidate specific paths
    revalidatePath("/api/gbp/reviews")
    revalidatePath("/api/gbp/locations")

    // Optionally fetch and cache the latest review immediately
    if (notificationType === "NEW_REVIEW" || notificationType === "UPDATED_REVIEW") {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fincaguarumo.com"
        const prewarmUrl = new URL(`${siteUrl}/api/gbp/reviews`)
        prewarmUrl.searchParams.set("locationId", locationName)
        prewarmUrl.searchParams.set("pageSize", "10")

        await fetch(prewarmUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Tag": reviewCacheTag,
          },
          next: { tags: [reviewCacheTag] },
        })
      } catch (err) {
        console.warn("Failed to pre-warm review cache:", err)
      }
    }

    return NextResponse.json({ 
      success: true, 
      locationName,
      notificationType,
      invalidatedTags: [reviewCacheTag, locationsCacheTag]
    })
  } catch (err) {
    console.error("GBP webhook error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}