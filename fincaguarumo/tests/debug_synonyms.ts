import { normalizeToStemmedTokens } from "../src/lib/nlp"

// Check what our normalized synonyms look like
console.log("Testing normalizeToStemmedTokens on synonym phrases:")

// Test some key phrases
const testPhrases = [
  "host",
  "helpful",
  "location",
  "near",
  "clean",
  "spotless",
  "view",
  "vista",
  "ocean view",
  "mountain view",
  "sunset",
  "sunrise",
  "friendly",
  "welcoming",
  "kitchen",
  "bathroom",
  "wifi",
  "internet",
  "air conditioning",
  "pool",
  "garden",
  "comfortable",
  "cozy",
  "quiet",
  "peaceful",
  "value",
  "price",
  "expensive",
  "cheap",
  "affordable",
  "private",
  "secluded",
  "noise",
  "silent",
  "soundproof",
]

testPhrases.forEach(phrase => {
  const normalized = normalizeToStemmedTokens(phrase).join(" ")
  console.log(`"${phrase}" -> "${normalized}"`)
})
