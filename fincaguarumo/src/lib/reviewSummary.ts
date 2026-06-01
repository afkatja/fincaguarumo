// Template-based review summary generation
import { processReviewsForAspects } from "./nlp"

/**
 * Generate a human-readable summary of what guests like most based on processed aspects
 */
export function generateReviewSummary(
  reviews: Array<{
    text: string
    rating: number
    date: string | Date
    platform: string
  }>,
): string {
  if (!reviews || reviews.length === 0) {
    return "No reviews available to summarize."
  }

  // Process reviews to get scored aspects
  const aspects = processReviewsForAspects(reviews)

  // Filter to top aspects (top 3-4)
  const topAspects = aspects.slice(0, Math.min(4, aspects.length))

  if (topAspects.length === 0) {
    return "No specific aspects were mentioned frequently enough to generate a summary."
  }

  // Generate summary using templates
  const summaryParts = []

  // First aspect (most prominent)
  if (topAspects.length >= 1) {
    const first = topAspects[0]
    summaryParts.push(
      `Guests most often praise the ${first.aspect}, especially its ${getAspectDetail(first.aspect)}.`,
    )
  }

  // Second aspect
  if (topAspects.length >= 2) {
    const second = topAspects[1]
    summaryParts.push(
      `Many reviewers also mention the ${second.aspect} and the sense of ${getAspectQuality(second.aspect)}.`,
    )
  }

  // Third aspect
  if (topAspects.length >= 3) {
    const third = topAspects[2]
    summaryParts.push(
      `The most consistent operational strength is ${third.aspect} from the hosts.`,
    )
  }

  // Fourth aspect (if exists)
  if (topAspects.length >= 4) {
    const fourth = topAspects[3]
    summaryParts.push(`A smaller but recurring theme is ${fourth.aspect}.`)
  }

  return summaryParts.join(" ")
}

/**
 * Get specific detail for an aspect based on its type
 */
function getAspectDetail(aspect: string): string {
  const details: Record<string, string> = {
    location: "proximity to local attractions and beautiful surroundings",
    cleanliness: "spotless conditions and attention to detail",
    views: "breathtaking ocean vistas and stunning sunsets",
    communication: "responsive and friendly host interactions",
    amenities: "well-equipped facilities and thoughtful provisions",
    comfort: "cozy atmosphere and relaxing environment",
    value: "excellent price-to-quality ratio",
    privacy: "secluded setting and peaceful surroundings",
    noise: "quiet environment and peaceful atmosphere",
  }

  return details[aspect] || "notable qualities"
}

/**
 * Get quality descriptor for an aspect
 */
function getAspectQuality(aspect: string): string {
  const qualities: Record<string, string> = {
    location: "convenience",
    cleanliness: "cleanliness",
    views: "beauty",
    communication: "hospitality",
    amenities: "convenience",
    comfort: "relaxation",
    value: "affordability",
    privacy: "seclusion",
    noise: "tranquility",
  }

  return qualities[aspect] || "satisfaction"
}
