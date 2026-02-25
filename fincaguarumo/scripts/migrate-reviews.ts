// Migration script to migrate reviews from data files to Sanity reviewType

import airbnbReviews from "../data/airbnb-reviews"
import bookingReviews from "../data/booking-reviews"
import { migrationClient } from "./migrationClient"

interface ReviewData {
  platform: string
  author: {
    name: string
    location?: string
    photoURI?: string
  }
  rating: number
  date: string
  reviewText: string
  photoUrl?: string
}

interface SanityReviewDocument extends ReviewData {
  _type: string
  _id: string
  author: {
    name: string
    location?: string
    photoURI?: string
  }
  photoUrl?: string
}

// Helper function to convert date string to ISO format
function parseDate(dateString: string): string {
  // Handle "Month Day, Year" format (e.g., "July 8, 2025")
  if (dateString.includes(",")) {
    const date = new Date(dateString)
    return date.toISOString().split("T")[0]
  }

  // Handle ISO format (e.g., "2025-12-26")
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString
  }

  // Fallback
  return new Date(dateString).toISOString().split("T")[0]
}

// Helper function to preserve original rating scale
function preserveRating(rating: number, platform: string): number {
  // Keep ratings in their original scale
  // Display components will handle normalization to 5-star system
  return rating
}

// Helper function to get photo URL
function getPhotoUrl(review: any): string | undefined {
  return review.photoUrl || review.author?.photoURI
}

async function migrateReviews() {
  try {
    console.log("Starting reviews migration...")

    // Combine all reviews
    const allReviews = [...airbnbReviews, ...bookingReviews]
    console.log(`Found ${allReviews.length} reviews to migrate`)

    // Process each review
    for (const review of allReviews) {
      // Create a unique ID based on platform and author name
      const uniqueId = `review-${review.platform}-${review.author.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}`

      const reviewDoc: SanityReviewDocument = {
        _id: uniqueId,
        _type: "review",
        platform: review.platform,
        author: {
          name: review.author.name,
          location: review.author.location || undefined,
          photoURI: getPhotoUrl(review) || undefined,
        },
        rating: preserveRating(review.rating, review.platform),
        date: parseDate(review.date),
        reviewText: review.reviewText,
        photoUrl: getPhotoUrl(review) || undefined,
      }

      try {
        const result = await migrationClient.createOrReplace(reviewDoc)
        console.log(
          `✅ Migrated review: ${review.author.name} (${review.platform})`,
        )
      } catch (error) {
        console.error(
          `❌ Failed to migrate review: ${review.author.name}`,
          error,
        )
      }
    }

    console.log("\n✅ Reviews migration completed successfully!")
    console.log(`Total reviews processed: ${allReviews.length}`)
    console.log("\nNext steps:")
    console.log("1. Verify reviews in Sanity Studio")
    console.log("2. Test review display components")
    console.log("3. Update any existing review references")
  } catch (error) {
    console.error("❌ Migration failed:", error)
  }
}

// Run the migration
migrateReviews()
