import { NextRequest, NextResponse } from "next/server"
import { processReviewsForAspects } from "../../../lib/nlp"
import { generateReviewSummary } from "../../../lib/reviewSummary"

export async function POST(request: NextRequest) {
  try {
    const { reviews } = await request.json()

    if (!Array.isArray(reviews)) {
      return NextResponse.json(
        { error: "reviews must be an array" },
        { status: 400 }
      )
    }

    // Process reviews for aspects
    const processedAspects = processReviewsForAspects(reviews)

    // Generate summary text
    const summaryText = generateReviewSummary(reviews)

    return NextResponse.json({
      processedAspects,
      summaryText,
    })
  } catch (error) {
    console.error("Error processing reviews:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process reviews" },
      { status: 500 }
    )
  }
}
