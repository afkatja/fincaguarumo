/**
 * Source restrictions for the booking chatbot
 * Ensures only app-relevant content is used and politely refuses unrelated queries
 */

export interface SourceRestrictions {
  allowedKeywords: string[]
  allowedDomains: string[]
  allowedTopics: string[]
  refusalMessage: string
}

export const APP_SOURCE_RESTRICTIONS: SourceRestrictions = {
  allowedKeywords: [
    // Property-specific terms
    "villa bruno",
    "fincaguarumo",
    "guarumo",
    "costa rica",
    "osa peninsula",
    "vacation rental",
    "accommodation",
    "property",
    "booking",
    "reservation",

    // Booking-related terms
    "availability",
    "check-in",
    "check-out",
    "dates",
    "guests",
    "price",
    "pricing",
    "discount",
    "cost",
    "payment",
    "cancel",
    "cancellation",
    "refund",
    "policy",

    // Property features
    "amenities",
    "facilities",
    "pool",
    "wifi",
    "kitchen",
    "bedroom",
    "bathroom",
    "terrace",
    "garden",
    "view",
    "solar",
    "off-grid",
    "accessibilty",
    "children",
    "senior",

    // Location and activities
    "tour",
    "activity",
    "excursion",
    "attraction",
    "beach",
    "rainforest",
    "wildlife",
    "nature",
    "hiking",
    "transport",
    "direction",
    "logistics",

    // Reviews and ratings
    "review",
    "rating",
    "feedback",
    "guest",
    "experience",

    // Local area
    "local",
    "area",
    "nearby",
    "around",
    "location",
    "restaurant",
    "shopping",

    // General hospitality
    "host",
    "staff",
    "service",
    "welcome",
    "hospitality",
  ],

  allowedDomains: [
    "fincaguarumo.com",
    "villa-bruno.com",
    "localhost",
    "vercel.app",
    "netlify.app",
  ],

  allowedTopics: [
    "booking",
    "reservation",
    "availability",
    "pricing",
    "payment",
    "discounts",
    "cancellation",
    "amenities",
    "facilities",
    "property",
    "accommodation",
    "tours",
    "activities",
    "local-attractions",
    "logistics",
    "directions",
    "reviews",
    "ratings",
    "hospitality",
    "customer-service",
  ],

  refusalMessage:
    "I'm here to help you with booking Villa Bruno and questions about our property, amenities, tours, and local area. For general questions or topics unrelated to our vacation rental, I'd need to connect you with a human representative who can better assist you. Is there anything specific about Villa Bruno or your stay with us that I can help you with?",
}

/**
 * Check if a query is relevant to the app
 */
export function isQueryRelevant(query: string): boolean {
  const lowerQuery = query.toLowerCase()

  // Check for allowed keywords
  const hasAllowedKeyword = APP_SOURCE_RESTRICTIONS.allowedKeywords.some(
    keyword => lowerQuery.includes(keyword.toLowerCase()),
  )

  // Check for booking-related patterns even if specific keywords aren't present
  const hasBookingPattern =
    /\b(book|reserve|availability|price|cost|pay|cancel|amenit|room|stay|night|guest)\b/i.test(
      query,
    )

  // Check for question patterns that might be about the property
  const hasPropertyQuestionPattern =
    /\b(what|how|where|when|do|are|is|can)\b.*\b(villa|property|accommodation|room|stay|book|tour)\b/i.test(
      query,
    )

  return hasAllowedKeyword || hasBookingPattern || hasPropertyQuestionPattern
}

/**
 * Check if a source URL is from an allowed domain
 */
export function isSourceAllowed(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    return APP_SOURCE_RESTRICTIONS.allowedDomains.some(
      domain =>
        hostname.includes(domain.toLowerCase()) ||
        hostname.endsWith(domain.toLowerCase()),
    )
  } catch {
    // Invalid URL, not allowed
    return false
  }
}

/**
 * Filter sources to only include allowed ones
 */
export function filterAllowedSources(
  sources: Array<{ url?: string; content?: string }>,
): Array<{ url?: string; content?: string }> {
  return sources.filter(source => {
    if (!source.url) return false
    return isSourceAllowed(source.url)
  })
}

/**
 * Get refusal response for unrelated queries
 */
export function getRefusalResponse(): string {
  return APP_SOURCE_RESTRICTIONS.refusalMessage
}

/**
 * Enhance system prompt with source restrictions
 */
export function getSourceRestrictedPrompt(basePrompt: string): string {
  return `${basePrompt}

CRITICAL SOURCE RESTRICTIONS:
- You MUST ONLY use information from the Villa Bruno database and provided context
- You MUST NEVER search for or reference external sources, websites, or general knowledge
- If a user asks a generic question (weather, news, politics, general advice, etc.), you MUST politely refuse and redirect to Villa Bruno topics
- If a user asks about locations other than Costa Rica or topics unrelated to this vacation rental, you MUST politely refuse
- Assume ALL user queries are about Villa Bruno unless they are clearly unrelated
- When in doubt, err on the side of assuming relevance to Villa Bruno
- NEVER mention external websites, news articles, or sources outside the Villa Bruno context

APPROPRIATE RESPONSES:
- For booking questions: Use booking tools and property data
- For property questions: Use amenities, features, and logistics data
- For local area questions: Use tours and local attractions data
- For unrelated questions: "${getRefusalResponse()}"

Remember: You are a Villa Bruno booking assistant, not a general knowledge AI. Stay focused on helping guests with their stay and booking.`
}
