import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

export const revalidate = 0

export async function POST(request: NextRequest) {
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

    console.log(`GBP webhook received: ${notificationType} for ${locationName}`)

    // Invalidate cache for this location's reviews
    const reviewCacheTag = `gbp-reviews-${locationName.replace(/\//g, "-")}`
    const locationsCacheTag = "gbp-locations"

    revalidateTag(reviewCacheTag)
    revalidateTag(locationsCacheTag)

    // Optionally fetch and cache the latest review immediately
    if (notificationType === "NEW_REVIEW" || notificationType === "UPDATED_REVIEW") {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://fincaguarumo.com"}/api/gbp/reviews`, {
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