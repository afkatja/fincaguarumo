// NLP utility functions for processing review text
import natural from "natural"

const tokenizer = new natural.WordTokenizer()
const stemmer = natural.PorterStemmer

type Aspect =
  | "location"
  | "cleanliness"
  | "views"
  | "communication"
  | "amenities"
  | "comfort"
  | "value"
  | "privacy"
  | "noise"

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "her",
  "his",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "those",
  "to",
  "very",
  "was",
  "we",
  "were",
  "with",
  "would",
  "i",
  "you",
  "our",
  "my",
  "your",
  "have",
  "had",
  "been",
  "being",
  "did",
  "does",
  "do",
  "just",
  "really",
  "quite",
  "so",
  "but",
  "or",
])

const PLATFORM_BOILERPLATE = [
  /this host/gi,
  /superhost/gi,
  /entire home/gi,
  /private room/gi,
  /shared room/gi,
  /reviewed on/gi,
  /stayed in/gi,
  /month year/gi,
  /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
  /would recommend/gi,
  /highly recommend/gi,
  /would stay again/gi,
  /loved my stay/gi,
  /great place/gi,
  /nice place/gi,
]

const HOSPITALITY_SYNONYMS: Record<Aspect, string[]> = {
  location: [
    "location",
    "located",
    "near",
    "close",
    "close to",
    "walking distance",
    "steps from",
    "area",
    "neighborhood",
    "surroundings",
    "position",
    "accessible",
    "convenient",
  ],
  cleanliness: [
    "clean",
    "spotless",
    "tidy",
    "immaculate",
    "pristine",
    "hygienic",
    "sanitary",
    "neat",
    "dirty",
    "filthy",
    "messy",
  ],
  views: [
    "view",
    "vista",
    "panorama",
    "outlook",
    "scenery",
    "landscape",
    "seascape",
    "ocean view",
    "mountain view",
    "sunset",
    "sunrise",
  ],
  communication: [
    "host",
    "hostess",
    "owner",
    "manager",
    "responsive",
    "communication",
    "contact",
    "reply",
    "response",
    "helpful",
    "friendly",
    "welcoming",
    "kind",
  ],
  amenities: [
    "amenity",
    "facility",
    "equipment",
    "provided",
    "available",
    "kitchen",
    "bathroom",
    "bedroom",
    "living room",
    "wifi",
    "internet",
    "air conditioning",
    "heater",
    "pool",
    "garden",
    "parking",
  ],
  comfort: [
    "comfortable",
    "cozy",
    "relaxing",
    "peaceful",
    "quiet",
    "serene",
    "tranquil",
    "restful",
    "spacious",
    "roomy",
    "bed",
    "sleep",
  ],
  value: [
    "value",
    "price",
    "cost",
    "rate",
    "fee",
    "expensive",
    "cheap",
    "affordable",
    "reasonable",
    "worth",
    "budget",
    "economical",
  ],
  privacy: [
    "private",
    "privacy",
    "secluded",
    "isolated",
    "remote",
    "alone",
    "undisturbed",
  ],
  noise: ["noise", "noisy", "loud", "silent", "soundproof"],
}

const POSITIVE_WORDS = new Set([
  "good",
  "great",
  "excellent",
  "amazing",
  "wonderful",
  "fantastic",
  "perfect",
  "love",
  "loved",
  "like",
  "liked",
  "best",
  "better",
  "awesome",
  "brilliant",
  "outstanding",
  "superb",
  "magnificent",
  "splendid",
  "delightful",
  "pleasing",
  "satisfied",
  "happy",
  "pleased",
  "content",
  "impressed",
  "recommend",
  "helpful",
  "friendly",
  "clean",
  "spotless",
  "comfortable",
  "cozy",
  "quiet",
  "peaceful",
  "spacious",
  "affordable",
  "reasonable",
  "beautiful",
])

const NEGATIVE_WORDS = new Set([
  "bad",
  "poor",
  "terrible",
  "awful",
  "horrible",
  "disappointing",
  "worst",
  "hate",
  "hated",
  "dislike",
  "disliked",
  "worse",
  "boring",
  "uncomfortable",
  "dirty",
  "filthy",
  "messy",
  "noisy",
  "noise",
  "slow",
  "rude",
  "unhelpful",
  "unsatisfied",
  "unhappy",
  "expensive",
  "loud",
  "crowded",
])

const NEGATIONS = new Set(["not", "no", "never", "hardly", "barely", "without"])

function cleanText(text: string): string {
  if (!text) return ""

  let normalized = text.toLowerCase()
  for (const pattern of PLATFORM_BOILERPLATE) {
    normalized = normalized.replace(pattern, " ")
  }

  return normalized
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenizeWords(text: string): string[] {
  return tokenizer.tokenize(text)
}

function normalizePhrase(text: string): string {
  return cleanText(text)
}

function stemPhrase(text: string): string {
  return normalizeToStemmedTokens(text).join(" ")
}

const SYNONYM_LOOKUP: Record<Aspect, Set<string>> = Object.fromEntries(
  Object.entries(HOSPITALITY_SYNONYMS).map(([aspect, phrases]) => [
    aspect,
    new Set(
      phrases.flatMap(phrase => {
        const normalized = normalizePhrase(phrase)
        const stemmed = stemPhrase(phrase)
        return [normalized, stemmed].filter(Boolean)
      }),
    ),
  ]),
) as Record<Aspect, Set<string>>

function createEmptyAspectCounts(): Record<Aspect, number> {
  return {
    location: 0,
    cleanliness: 0,
    views: 0,
    communication: 0,
    amenities: 0,
    comfort: 0,
    value: 0,
    privacy: 0,
    noise: 0,
  }
}

export function normalizeToStemmedTokens(text: string): string[] {
  if (!text) return []

  return tokenizeWords(cleanText(text))
    .map(token => token.trim())
    .filter(token => token.length > 2 && !STOPWORDS.has(token))
    .map(token => stemmer.stem(token))
}

export function normalizeReviewText(text: string): string {
  return normalizeToStemmedTokens(text).join(" ")
}

export function extractSentences(text: string): string[] {
  if (!text) return []

  return text
    .split(/(?<=[.!?])\s+|[\n\r]+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)
}

export function extractNounPhrases(text: string): string[] {
  if (!text) return []

  const normalized = normalizePhrase(text)
  const words = tokenizeWords(normalized).filter(Boolean)
  const phrases = new Set<string>()

  for (let i = 0; i < words.length; i++) {
    const unigram = words[i]
    if (unigram && unigram.length > 2 && !STOPWORDS.has(unigram)) {
      phrases.add(unigram)
    }

    if (i < words.length - 1) {
      const bigramWords = [words[i], words[i + 1]].filter(
        word => word.length > 1 && !STOPWORDS.has(word),
      )
      if (bigramWords.length === 2) {
        phrases.add(bigramWords.join(" "))
      }
    }

    if (i < words.length - 2) {
      const trigramWords = [words[i], words[i + 1], words[i + 2]].filter(
        word => word.length > 1 && !STOPWORDS.has(word),
      )
      if (trigramWords.length >= 2) {
        phrases.add(trigramWords.join(" "))
      }
    }
  }

  return Array.from(phrases)
}

function detectAspectsInText(text: string): Record<Aspect, number> {
  const counts = createEmptyAspectCounts()
  const normalizedText = normalizePhrase(text)
  const stemmedText = stemPhrase(text)
  const candidates = new Set<string>([
    ...extractNounPhrases(normalizedText),
    ...extractNounPhrases(stemmedText),
  ])

  for (const [aspect, synonyms] of Object.entries(SYNONYM_LOOKUP) as Array<
    [Aspect, Set<string>]
  >) {
    let matched = false
    for (const synonym of synonyms) {
      if (!synonym) continue

      if (synonym.includes(" ")) {
        if (normalizedText.includes(synonym) || stemmedText.includes(synonym)) {
          matched = true
          break
        }
      } else if (
        candidates.has(synonym) ||
        normalizedText.split(" ").includes(synonym) ||
        stemmedText.split(" ").includes(synonym)
      ) {
        matched = true
        break
      }
    }

    if (matched) {
      counts[aspect] += 1
    }
  }

  return counts
}

export function mapToAspects(terms: string[]): Record<string, number> {
  const counts = createEmptyAspectCounts()
  const seenSignals = new Set<string>()

  for (const rawTerm of terms) {
    const normalizedTerm = normalizePhrase(rawTerm)
    const stemmedTerm = stemPhrase(rawTerm)
    const variants = [normalizedTerm, stemmedTerm].filter(Boolean)

    for (const [aspect, synonyms] of Object.entries(SYNONYM_LOOKUP) as Array<
      [Aspect, Set<string>]
    >) {
      const matched = variants.some(variant => {
        if (synonyms.has(variant)) return true
        return Array.from(synonyms).some(synonym => {
          if (!synonym.includes(" ")) {
            return variant.split(" ").includes(synonym)
          }
          return variant.includes(synonym)
        })
      })

      if (matched) {
        const signalKey = `${aspect}:${normalizedTerm || stemmedTerm}`
        if (!seenSignals.has(signalKey)) {
          counts[aspect] += 1
          seenSignals.add(signalKey)
        }
      }
    }
  }

  return counts
}

export function calculateSentiment(text: string): number {
  if (!text) return 0

  const words = tokenizeWords(cleanText(text))
  let score = 0
  let hits = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    let polarity = 0

    if (POSITIVE_WORDS.has(word)) polarity = 1
    if (NEGATIVE_WORDS.has(word)) polarity = -1
    if (!polarity) continue

    const prev = words[i - 1]
    const prev2 = words[i - 2]
    if (NEGATIONS.has(prev) || NEGATIONS.has(prev2)) {
      polarity *= -1
    }

    score += polarity
    hits += 1
  }

  return hits === 0 ? 0 : Math.max(-1, Math.min(1, score / hits))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function calculateAspectSentiment(sentence: string, aspect: Aspect): number {
  const sentenceSentiment = calculateSentiment(sentence)
  const aspectSignals = detectAspectsInText(sentence)[aspect]
  if (!aspectSignals) return 0

  const words = tokenizeWords(cleanText(sentence))
  const synonyms = SYNONYM_LOOKUP[aspect]
  let localScore = 0
  let localHits = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const nearby = words.slice(Math.max(0, i - 3), i + 4)
    const nearbyText = nearby.join(" ")
    const nearbyStemmed = stemPhrase(nearbyText)
    const touchesAspect = Array.from(synonyms).some(synonym =>
      synonym.includes(" ")
        ? nearbyText.includes(synonym) || nearbyStemmed.includes(synonym)
        : nearby.includes(synonym) ||
          nearbyStemmed.split(" ").includes(synonym),
    )
    if (!touchesAspect) continue

    let polarity = 0
    if (POSITIVE_WORDS.has(word)) polarity = 1
    if (NEGATIVE_WORDS.has(word)) polarity = -1
    if (!polarity) continue

    const prev = words[i - 1]
    const prev2 = words[i - 2]
    if (NEGATIONS.has(prev) || NEGATIONS.has(prev2)) {
      polarity *= -1
    }

    localScore += polarity
    localHits += 1
  }

  if (localHits > 0) {
    return clamp(localScore / localHits, -1, 1)
  }

  return sentenceSentiment
}

export function processReviewsForAspects(
  reviews: Array<{
    text: string
    rating: number
    date: string | Date
    platform: string
  }>,
): Array<{
  aspect: string
  score: number
  mentionCount: number
  positiveMentions: number
  negativeMentions: number
}> {
  const allAspects: Record<
    Aspect,
    {
      mentionCount: number
      positiveMentions: number
      negativeMentions: number
      sentimentSum: number
      weightedMentionSum: number
    }
  > = {
    location: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    cleanliness: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    views: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    communication: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    amenities: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    comfort: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    value: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    privacy: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
    noise: {
      mentionCount: 0,
      positiveMentions: 0,
      negativeMentions: 0,
      sentimentSum: 0,
      weightedMentionSum: 0,
    },
  }

  for (const review of reviews) {
    const recencyWeight = calculateRecencyWeight(new Date(review.date))
    const sentences = extractSentences(review.text)

    for (const sentence of sentences) {
      const aspectMentions = detectAspectsInText(sentence)

      for (const [aspect, count] of Object.entries(aspectMentions) as Array<
        [Aspect, number]
      >) {
        if (!count) continue

        const sentiment = calculateAspectSentiment(sentence, aspect)
        const weight = count * recencyWeight
        const data = allAspects[aspect]

        data.mentionCount += count
        data.weightedMentionSum += weight
        data.sentimentSum += sentiment * weight

        if (sentiment > 0.05) {
          data.positiveMentions += weight
        } else if (sentiment < -0.05) {
          data.negativeMentions += weight
        }
      }
    }
  }

  return (
    Object.entries(allAspects) as Array<[Aspect, (typeof allAspects)[Aspect]]>
  )
    .filter(([, data]) => data.mentionCount > 0)
    .map(([aspect, data]) => {
      const denominator = data.weightedMentionSum || data.mentionCount || 1
      const averageSentiment = data.sentimentSum / denominator
      const confidenceBoost = Math.log1p(data.mentionCount) / Math.log(2)
      const score = clamp(averageSentiment * confidenceBoost, -1, 1)

      return {
        aspect,
        score,
        mentionCount: data.mentionCount,
        positiveMentions: Number(data.positiveMentions.toFixed(3)),
        negativeMentions: Number(data.negativeMentions.toFixed(3)),
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.mentionCount - a.mentionCount
    })
}

function calculateRecencyWeight(date: Date): number {
  const now = new Date()
  const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

  if (!Number.isFinite(diffInDays) || diffInDays <= 30) {
    return 1
  }

  return Math.exp(-0.01 * (diffInDays - 30))
}
