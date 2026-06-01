import {
  normalizeReviewText,
  mapToAspects,
  extractNounPhrases,
  processReviewsForAspects,
} from "./src/lib/nlp"

// Test the normalize function
console.log("Testing normalizeReviewText:")
const testText = "The host was very helpful and the location was perfect!"
console.log(`Original: "${testText}"`)
console.log(`Normalized: "${normalizeReviewText(testText)}"`)

// Test the noun phrase extraction
console.log("\nTesting extractNounPhrases:")
const phrases = extractNounPhrases(normalizeReviewText(testText))
console.log(`Noun phrases: ${JSON.stringify(phrases)}`)

// Test the mapping to aspects
console.log("\nTesting mapToAspects:")
const aspects = mapToAspects(phrases)
console.log(`Aspect counts: ${JSON.stringify(aspects)}`)

// Test the full pipeline
console.log("\nTesting processReviewsForAspects:")
const testReviews = [
  {
    text: "The host was very helpful and the location was perfect!",
    rating: 5,
    date: new Date(),
    platform: "Airbnb",
  },
  {
    text: "The room was clean but a bit noisy.",
    rating: 4,
    date: new Date(),
    platform: "Booking.com",
  },
]

const results = processReviewsForAspects(testReviews)
console.log(`Results: ${JSON.stringify(results, null, 2)}`)
