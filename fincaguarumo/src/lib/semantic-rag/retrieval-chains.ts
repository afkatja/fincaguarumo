import {
  hybridSearch,
  semanticSearch,
  HybridSearchResult,
  SearchOptions,
} from "./vector-store"
import { processAllDocuments } from "./document-loaders"

export interface RetrievalChainOptions extends SearchOptions {
  useHybridSearch?: boolean
  contextSize?: number
  minRelevanceScore?: number
}

export interface RetrievedContext {
  content: string
  metadata: Record<string, any>
  relevanceScore: number
  contentType: string
  source: string
}

export interface QueryIntent {
  primary: string
  confidence: number
  entities: string[]
  keywords: string[]
}

/**
 * Detect query intent using semantic analysis
 */
export function detectQueryIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase()

  // Intent patterns with confidence scores
  const intentPatterns = [
    {
      intent: "booking",
      confidence: 0.9,
      keywords: [
        "book",
        "reserve",
        "availability",
        "dates",
        "check-in",
        "check-out",
        "booking",
        "reservation",
      ],
    },
    {
      intent: "amenities",
      confidence: 0.8,
      keywords: [
        "amenit",
        "facilit",
        "feature",
        "pool",
        "wifi",
        "kitchen",
        "room",
        "bed",
      ],
    },
    {
      intent: "pricing",
      confidence: 0.8,
      keywords: [
        "price",
        "cost",
        "fee",
        "discount",
        "season",
        "rate",
        "charge",
      ],
    },
    {
      intent: "payment",
      confidence: 0.8,
      keywords: ["payment", "pay", "card", "stripe", "paypal", "transaction"],
    },
    {
      intent: "cancellation",
      confidence: 0.8,
      keywords: ["cancel", "refund", "modification", "change", "policy"],
    },
    {
      intent: "logistics",
      confidence: 0.8,
      keywords: [
        "check",
        "arrival",
        "departure",
        "transport",
        "direction",
        "parking",
      ],
    },
    {
      intent: "tours",
      confidence: 0.8,
      keywords: ["tour", "activity", "attraction", "excursion", "trip"],
    },
    {
      intent: "reviews",
      confidence: 0.8,
      keywords: ["review", "rating", "feedback", "guest", "experience"],
    },
    {
      intent: "local_info",
      confidence: 0.7,
      keywords: [
        "local",
        "area",
        "nearby",
        "around",
        "location",
        "beach",
        "restaurant",
      ],
    },
  ]

  // Find matching intents
  const matchedIntents = intentPatterns
    .map(pattern => {
      const matchCount = pattern.keywords.filter(keyword =>
        lowerQuery.includes(keyword),
      ).length

      const confidence =
        matchCount > 0
          ? pattern.confidence * (matchCount / pattern.keywords.length)
          : 0

      return {
        intent: pattern.intent,
        confidence,
        keywords: pattern.keywords.filter(keyword =>
          lowerQuery.includes(keyword),
        ),
      }
    })
    .filter(match => match.confidence > 0)

  // Sort by confidence and get the best match
  matchedIntents.sort((a, b) => b.confidence - a.confidence)
  const bestMatch = matchedIntents[0]

  // Extract entities (simple pattern matching)
  const entities = extractEntities(query)

  return {
    primary: bestMatch?.intent || "general",
    confidence: bestMatch?.confidence || 0.5,
    entities,
    keywords: bestMatch?.keywords || [],
  }
}

/**
 * Extract entities from query (simple implementation)
 */
function extractEntities(query: string): string[] {
  const entities: string[] = []

  // Date patterns
  const datePatterns = [
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    /\b(\d{1,2}-\d{1,2}-\d{4})\b/g,
  ]

  datePatterns.forEach(pattern => {
    const matches = query.match(pattern)
    if (matches) entities.push(...matches)
  })

  // Number patterns (guests, nights, etc.)
  const numberPattern = /\b(\d+)\s*(guests?|nights?|people?|days?)\b/gi
  const numberMatches = query.match(numberPattern)
  if (numberMatches) entities.push(...numberMatches)

  // Location patterns
  const locationPatterns = [
    /\b(costa rica|san jose|guanacaste|limon|puntarenas|alajuela|cartago|heredia)\b/gi,
    /\b(beach|pool|garden|terrace|balcony|kitchen|bedroom|bathroom)\b/gi,
  ]

  locationPatterns.forEach(pattern => {
    const matches = query.match(pattern)
    if (matches) entities.push(...matches)
  })

  return [...new Set(entities)] // Remove duplicates
}

/**
 * Create retrieval chain for specific content types
 */
export async function createRetrievalChain(
  query: string,
  options: RetrievalChainOptions = {},
): Promise<RetrievedContext[]> {
  const {
    useHybridSearch = true,
    contextSize = 10,
    minRelevanceScore = 0.5,
    language = "en",
    ...searchOptions
  } = options

  try {
    // Detect query intent
    const intent = detectQueryIntent(query)

    // Determine content types to search based on intent
    const contentTypes = getContentTypesForIntent(intent.primary)

    // Perform search
    const searchResults = useHybridSearch
      ? await hybridSearch(query, {
          ...searchOptions,
          language,
          maxResults: contextSize * 2,
        })
      : await semanticSearch(query, {
          ...searchOptions,
          language,
          maxResults: contextSize * 2,
        })

    // Filter by intent-relevant content types
    const relevantResults = searchResults.filter(result => {
      const hybridResult = result as HybridSearchResult
      return (
        contentTypes.includes(result.contentType) &&
        (useHybridSearch ? hybridResult.combinedScore : result.similarity) >=
          minRelevanceScore
      )
    })

    // Convert to RetrievedContext format
    const contexts: RetrievedContext[] = relevantResults.map(result => {
      const hybridResult = result as HybridSearchResult
      return {
        content: result.content,
        metadata: {
          ...result.metadata,
          contentType: result.contentType,
          language: result.language,
          contentId: result.contentId,
          similarity: result.similarity,
          ...(useHybridSearch && {
            keywordScore: hybridResult.keywordScore,
            combinedScore: hybridResult.combinedScore,
          }),
        },
        relevanceScore: useHybridSearch
          ? hybridResult.combinedScore
          : result.similarity,
        contentType: result.contentType,
        source: `${result.contentType}:${result.contentId}`,
      }
    })

    // Sort by relevance and limit
    contexts.sort((a, b) => b.relevanceScore - a.relevanceScore)
    return contexts.slice(0, contextSize)
  } catch (error) {
    console.error("Error in retrieval chain:", error)
    throw new Error(
      `Retrieval chain error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get content types to search based on query intent
 */
function getContentTypesForIntent(intent: string): string[] {
  const intentToContentTypes: Record<string, string[]> = {
    booking: ["faq", "page", "logistics"],
    amenities: ["amenity", "faq", "page"],
    pricing: ["pricing_rule", "faq", "page"],
    payment: ["payment_method", "faq"],
    cancellation: ["cancellation_policy", "faq"],
    logistics: ["logistics", "faq"],
    tours: ["tour", "post"],
    reviews: ["review"],
    local_info: ["post", "tour"],
    general: ["faq", "page", "home"],
  }

  return intentToContentTypes[intent] || intentToContentTypes.general
}

/**
 * Create multi-step retrieval chain for complex queries
 */
export async function createMultiStepRetrievalChain(
  query: string,
  options: RetrievalChainOptions = {},
): Promise<{
  primaryContext: RetrievedContext[]
  secondaryContext: RetrievedContext[]
  intent: QueryIntent
}> {
  try {
    const intent = detectQueryIntent(query)

    // Step 1: Primary retrieval based on intent
    const primaryContentTypes = getContentTypesForIntent(intent.primary)
    const primaryResults = await createRetrievalChain(query, {
      ...options,
      ...{ contentTypes: primaryContentTypes, contextSize: 5 },
    })

    // Step 2: Secondary retrieval for broader context
    const secondaryContentTypes = ["faq", "page", "home"] // General context
    const secondaryResults = await createRetrievalChain(query, {
      ...options,
      ...{ contentTypes: secondaryContentTypes, contextSize: 3 },
    })

    // Step 3: Remove duplicates between primary and secondary
    const primarySources = new Set(primaryResults.map(r => r.source))
    const filteredSecondary = secondaryResults.filter(
      r => !primarySources.has(r.source),
    )

    return {
      primaryContext: primaryResults,
      secondaryContext: filteredSecondary,
      intent,
    }
  } catch (error) {
    console.error("Error in multi-step retrieval chain:", error)
    throw new Error(
      `Multi-step retrieval chain error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Create conversational retrieval chain (includes conversation history)
 */
export async function createConversationalRetrievalChain(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: RetrievalChainOptions = {},
): Promise<RetrievedContext[]> {
  try {
    // Extract context from conversation history
    const contextFromHistory = extractContextFromHistory(conversationHistory)

    // Enhance query with conversation context
    const enhancedQuery = contextFromHistory
      ? `${contextFromHistory}\n\nCurrent question: ${query}`
      : query

    // Perform retrieval with enhanced query
    const contexts = await createRetrievalChain(enhancedQuery, options)

    // Add conversation metadata to contexts
    return contexts.map(context => ({
      ...context,
      metadata: {
        ...context.metadata,
        conversational: true,
        historyContext: contextFromHistory,
      },
    }))
  } catch (error) {
    console.error("Error in conversational retrieval chain:", error)
    throw new Error(
      `Conversational retrieval chain error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Extract relevant context from conversation history
 */
function extractContextFromHistory(
  history: Array<{ role: string; content: string }>,
): string {
  // Get the last few user messages
  const recentUserMessages = history
    .filter(msg => msg.role === "user")
    .slice(-3) // Last 3 user messages
    .map(msg => msg.content)

  if (recentUserMessages.length === 0) return ""

  // Extract key topics from recent messages
  const topics = recentUserMessages.join(" ").toLowerCase()

  // Simple topic extraction (can be enhanced with NLP)
  const topicKeywords =
    topics.match(
      /\b(book|reserve|price|payment|cancel|amenit|tour|review|location|check|arrival|departure)\b/g,
    ) || []

  return topicKeywords.length > 2
    ? `Previous topics: ${topicKeywords.join(", ")}`
    : ""
}

/**
 * Create adaptive retrieval chain that adjusts strategy based on query complexity
 */
export async function createAdaptiveRetrievalChain(
  query: string,
  options: RetrievalChainOptions = {},
): Promise<RetrievedContext[]> {
  try {
    const intent = detectQueryIntent(query)

    // Determine retrieval strategy based on query characteristics
    const strategy = determineRetrievalStrategy(query, intent)

    switch (strategy) {
      case "precise":
        // Use semantic search with high threshold
        return await createRetrievalChain(query, {
          ...options,
          useHybridSearch: false,
          threshold: 0.8,
          contextSize: 5,
        })

      case "broad":
        // Use hybrid search with lower threshold
        return await createRetrievalChain(query, {
          ...options,
          useHybridSearch: true,
          threshold: 0.4,
          contextSize: 15,
        })

      case "conversational":
        // Use conversational approach
        return await createConversationalRetrievalChain(query, [], options)

      default:
        // Standard approach
        return await createRetrievalChain(query, options)
    }
  } catch (error) {
    console.error("Error in adaptive retrieval chain:", error)
    throw new Error(
      `Adaptive retrieval chain error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Determine retrieval strategy based on query characteristics
 */
function determineRetrievalStrategy(
  query: string,
  intent: QueryIntent,
): "precise" | "broad" | "conversational" | "standard" {
  const queryLength = query.split(" ").length
  const hasQuestionWords =
    /\b(what|how|where|when|why|which|who|is|are|do|does|can)\b/i.test(query)
  const hasSpecificTerms =
    /\b(check-in|check-out|availability|price|cost|specific|exact)\b/i.test(
      query,
    )

  // Precise queries: specific, short, with exact terms
  if (queryLength < 10 && hasSpecificTerms) {
    return "precise"
  }

  // Broad queries: general, exploratory, longer
  if (queryLength > 15 && !hasSpecificTerms && !hasQuestionWords) {
    return "broad"
  }

  // Conversational queries: follow-up, context-dependent
  if (
    intent.confidence < 0.7 ||
    /\b(also|again|what about|tell me more)\b/i.test(query)
  ) {
    return "conversational"
  }

  return "standard"
}
