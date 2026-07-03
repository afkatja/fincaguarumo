import {
  createAdaptiveRetrievalChain,
  RetrievedContext,
  createMultiStepRetrievalChain,
} from "./retrieval-chains"
import { rebuildEmbeddings } from "./vector-store"
import { testEmbeddingMethods } from "./embeddings-hybrid"
import { estimateTokenCount, truncateToTokenLimit } from "./token-utils"
import { getTokenBudget } from "../default-models.config"
import { generateEmbedding } from "./embeddings"
import {
  preprocessTextWithFallback,
  SupportedLanguage,
} from "./multilingual-preprocessing"
import {
  getCachedQueryEmbedding,
  getCachedContext,
  deduplicationManager,
  generateDeduplicationKey,
} from "./cache-manager"

export interface SemanticRAGContext {
  query: string
  intent: string
  contexts: RetrievedContext[]
  formattedContext: string
  metadata: {
    totalContexts: number
    averageRelevanceScore: number
    contentTypes: string[]
    processingTime: number
  }
}

export interface SemanticRAGOptions {
  locale?: string
  maxTokens?: number
  useMultiStep?: boolean
  includeMetadata?: boolean
  conversationHistory?: Array<{ role: string; content: string }>
  useBatchProcessing?: boolean
  modelRole?: "tools" | "fast" | "primary" | "evaluation"
}

// Centralized chunk configuration
const BATCH_CHUNK_SIZE = 3 // Number of queries to process in each batch

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Multi-language intent definitions with semantic examples
 */
const INTENT_DEFINITIONS = {
  pricing: {
    examples: [
      "price cost fee discount prepayment rate tariff",
      "precio costo tarifa descuento anticipo",
      "prijs kosten tarief korting aanbetaling",
      "Preis Kosten Gebühr Rabatt Vorauszahlung",
      "prix coût tarif réduction acompte",
    ],
  },
  amenities: {
    examples: [
      "amenities facilities pool wifi features services",
      "amenidades instalaciones piscina wifi características servicios",
      "voorzieningen faciliteiten zwembad wifi kenmerken diensten",
      "Annehmlichkeiten Einrichtungen Pool WLAN Funktionen Dienstleistungen",
      "équipements installations piscine wifi caractéristiques services",
    ],
  },
  tours: {
    examples: [
      "tours activities excursions trips experiences adventures",
      "tours actividades excursiones viajes experiencias aventuras",
      "tochten activiteiten excursies trips ervaringen avonturen",
      "Touren Aktivitäten Ausflüge Reisen Erlebnisse Abenteuer",
      "visites activités excursions voyages expériences aventures",
    ],
  },
  reviews: {
    examples: [
      "reviews ratings feedback testimonials opinions comments",
      "reseñas calificaciones comentarios testimonios opiniones",
      "beoordelingen ratings feedback testimonials meningen commentaren",
      "Bewertungen Ratings Feedback Testimonials Meinungen Kommentare",
      "avis notes commentaires témoignages opinions",
    ],
  },
  logistics: {
    examples: [
      "logistics transport parking directions check-in arrival",
      "logística transporte estacionamiento direcciones registro llegada",
      "logistiek transport parkeren route inchecken aankomst",
      "Logistik Transport Parken Anreise Check-in Ankunft",
      "logistique transport stationnement directions enregistrement arrivée",
    ],
  },
  cancellation: {
    examples: [
      "cancellation refund modification changes policy terms",
      "cancelación reembolso modificación cambios política términos",
      "annulering teruggave wijziging veranderingen voorwaarden",
      "Stornierung Rückerstattung Änderungen Richtlinien Bedingungen",
      "annulation remboursement modification changements politique conditions",
    ],
  },
  booking: {
    examples: [
      "booking reservation availability dates calendar schedule",
      "reserva disponibilidad fechas calendario horario",
      "boeking beschikbaarheid data kalender schema",
      "Buchung Verfügbarkeit Termine Kalender Zeitplan",
      "réservation disponibilité dates calendrier horaire",
    ],
  },
  availability: {
    examples: [
      "availability open dates free schedule calendar slots",
      "disponibilidad fechas libres horario calendario espacios",
      "beschikbaarheid data vrij schema kalender plekken",
      "Verfügbarkeit Termine frei Zeitplan Kalender Plätze",
      "disponibilité dates libres horaire calendrier créneaux",
    ],
  },
  general: {
    examples: [
      "information details help support contact about",
      "información detalles ayuda soporte contacto acerca",
      "informatie details hulp ondersteuning contact over",
      "Informationen Hilfe Unterstützung Kontakt über",
      "informations détails aide support contact à propos",
    ],
  },
} as const

/**
 * Intent embeddings cache for semantic intent detection
 * Language-specific caching for optimal performance
 */
let intentEmbeddingsCache: Record<string, Record<string, number[]>> = {}

/**
 * Generate or retrieve cached intent embeddings for a specific language
 */
async function getIntentEmbeddings(
  userLanguage?: string,
): Promise<Record<string, number[]>> {
  // Create language-specific cache key
  const cacheKey = userLanguage || "en"

  // Check if we already have embeddings for this language
  if (intentEmbeddingsCache[cacheKey]) {
    return intentEmbeddingsCache[cacheKey]
  }

  console.log(`Generating intent embeddings for language: ${cacheKey}`)

  intentEmbeddingsCache[cacheKey] = {}

  for (const [intent, definition] of Object.entries(INTENT_DEFINITIONS)) {
    // Use the first example (usually English) as it contains the core intent
    const primaryExample = definition.examples[0] || ""

    try {
      const embeddingResult = await generateEmbedding(
        primaryExample,
        cacheKey as SupportedLanguage,
      )
      intentEmbeddingsCache[cacheKey][intent] = embeddingResult.embedding
    } catch (error) {
      console.error(`Failed to generate embedding for intent ${intent}:`, error)
      // Fallback to zero vector
      intentEmbeddingsCache[cacheKey][intent] = new Array(768).fill(0) // e5-base-instruct dimension
    }
  }

  console.log(
    `Generated embeddings for ${Object.keys(intentEmbeddingsCache[cacheKey]).length} intents (language: ${cacheKey})`,
  )

  return intentEmbeddingsCache[cacheKey]
}

const INTENT_CHUNK_BUDGETS: Record<string, number> = {
  pricing: BATCH_CHUNK_SIZE, // base rate + season discount + fees
  amenities: BATCH_CHUNK_SIZE, // top 3 by relevance score
  tours: BATCH_CHUNK_SIZE, // featured + 2 most relevant
  reviews: BATCH_CHUNK_SIZE, // avg rating + 2 top reviews
  logistics: BATCH_CHUNK_SIZE, // check-in, parking, transport
  cancellation: 2, // policy + timeframes (usually one chunk anyway)
  booking: 2, // availability + payment
  availability: 2, // availability + calendar info
  general: BATCH_CHUNK_SIZE, // fallback
}

/**
 * Build semantic RAG context for user query
 */
export async function buildSemanticRAGContext(
  userQuery: string,
  pageContext: { page: string; slug?: string; locale: string },
  options: SemanticRAGOptions = {},
): Promise<SemanticRAGContext> {
  const startTime = Date.now()

  // Add deduplication to prevent infinite loops from the same query
  const deduplicationKey = generateDeduplicationKey(
    "buildSemanticRAGContext",
    userQuery,
    pageContext.locale,
    pageContext.page,
  )

  return deduplicationManager.deduplicate(deduplicationKey, async () => {
    return getCachedContext(userQuery, pageContext, options, async () => {
      // Original context building logic wrapped in cache
      return await buildSemanticRAGContextInternal(
        userQuery,
        pageContext,
        options,
        startTime,
      )
    })
  })
}

/**
 * Internal context building logic (wrapped by caching and deduplication)
 */
async function buildSemanticRAGContextInternal(
  userQuery: string,
  pageContext: { page: string; slug?: string; locale: string },
  options: SemanticRAGOptions,
  startTime: number,
): Promise<SemanticRAGContext> {
  const {
    locale = pageContext.locale,
    maxTokens = getTokenBudget(options.modelRole || "primary"),
    useMultiStep = false,
    includeMetadata = false,
    conversationHistory = [],
    useBatchProcessing = true,
  } = options

  try {
    // Use batch processing if enabled
    if (useBatchProcessing) {
      try {
        const { submitBatchRAGJob, getBatchJob, checkRedisConnection } =
          await import("./batch-api")

        // Check Redis connection before attempting batch processing
        const isRedisAvailable = await checkRedisConnection()
        if (!isRedisAvailable) {
          console.warn(
            "🔴 Redis not available, falling back to synchronous processing",
          )
          // Continue to synchronous processing (outside the if-else)
        } else {
          // Submit single query as batch job for cost optimization
          const jobId = await submitBatchRAGJob(
            [userQuery],
            pageContext,
            options,
          )

          // Wait for batch completion with improved timeout handling
          let job = await getBatchJob(jobId)
          let attempts = 0
          const maxAttempts = 15 // 15 seconds max wait for batch processing

          while (job && job.status === "pending" && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            job = await getBatchJob(jobId)
            attempts++
          }

          if (
            job &&
            job.status === "completed" &&
            job.result &&
            job.result.length > 0
          ) {
            console.log(`✅ Batch processing completed in ${attempts}s`)
            return job.result[0]
          } else if (job && job.status === "failed") {
            throw new Error(`Batch processing failed: ${job.error}`)
          } else {
            // Fallback to synchronous processing if batch takes too long
            console.warn(
              `⏱️ Batch processing timeout after ${attempts}s, falling back to synchronous processing`,
            )
          }
        }
      } catch (batchError) {
        // Detect specific Redis connection errors
        const errorMessage =
          batchError instanceof Error ? batchError.message : "Unknown error"
        const isRedisError =
          errorMessage.includes("Redis") ||
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("connection")

        if (isRedisError) {
          console.warn(
            "🔴 Redis connection error, falling back to synchronous processing:",
            errorMessage,
          )
        } else {
          console.warn(
            "⚠️ Batch processing failed, falling back to synchronous processing:",
            errorMessage,
          )
        }
      }
    }

    // Intent detection - disabled by default for performance
    // Set ENABLE_INTENT_DETECTION=true to re-enable if needed
    const enableIntentDetection = process.env.ENABLE_INTENT_DETECTION === "true"
    let detectedIntent = "general"
    let contextBudget = INTENT_CHUNK_BUDGETS.general

    if (enableIntentDetection) {
      detectedIntent = await detectIntentFromQuery(userQuery)
      contextBudget =
        INTENT_CHUNK_BUDGETS[detectedIntent] || INTENT_CHUNK_BUDGETS.general
    }

    // Choose retrieval strategy
    const retrievalResult = useMultiStep
      ? await createMultiStepRetrievalChain(userQuery, {
          language: locale,
          contextSize: contextBudget,
          useHybridSearch: true,
        })
      : {
          primaryContext: await createAdaptiveRetrievalChain(userQuery, {
            language: locale,
            contextSize: contextBudget,
            useHybridSearch: true,
          }),
          intent: {
            primary: detectedIntent,
            confidence: 0.5,
            entities: [],
            keywords: [],
          },
        }

    const contexts = [...retrievalResult.primaryContext]

    // Format context for LLM with token-based truncation
    const formattedContext = formatContextForLLM(contexts, {
      maxTokens,
      includeMetadata,
      pageContext,
      locale,
    })

    // Calculate metadata
    const metadata = {
      totalContexts: contexts.length,
      averageRelevanceScore:
        contexts.length > 0
          ? contexts.reduce((sum, ctx) => sum + ctx.relevanceScore, 0) /
            contexts.length
          : 0,
      contentTypes: [...new Set(contexts.map(ctx => ctx.contentType))],
      processingTime: Date.now() - startTime,
    }

    return {
      query: userQuery,
      intent: detectedIntent,
      contexts,
      formattedContext,
      metadata,
    }
  } catch (error) {
    console.error("Error building semantic RAG context:", error)
    throw new Error(
      `Semantic RAG context building error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Format retrieved contexts for LLM consumption
 * Strips metadata noise and uses token-based truncation
 */
function formatContextForLLM(
  contexts: RetrievedContext[],
  options: {
    maxTokens: number
    includeMetadata: boolean
    pageContext: { page: string; slug?: string; locale: string }
    locale: string
  },
): string {
  const { maxTokens, includeMetadata, pageContext, locale } = options

  if (contexts.length === 0) {
    return "No specific information found for this query. Please provide general assistance based on your knowledge."
  }

  let formattedText = `Context: ${pageContext.page}${pageContext.slug ? ` (${pageContext.slug})` : ""} in ${pageContext.locale}\n\n`

  // Group contexts by content type for better organization
  const groupedContexts = contexts.reduce(
    (groups, context) => {
      if (!groups[context.contentType]) {
        groups[context.contentType] = []
      }
      groups[context.contentType].push(context)
      return groups
    },
    {} as Record<string, RetrievedContext[]>,
  )

  // Format each content type with minimal metadata
  Object.entries(groupedContexts).forEach(([contentType, typeContexts]) => {
    formattedText += `${contentType}:\n`

    typeContexts.forEach((context, index) => {
      formattedText += `${index + 1}. ${context.content}`

      // Only include essential metadata to reduce noise
      if (includeMetadata && context.metadata.title) {
        formattedText += ` (${context.metadata.title})`
      }

      formattedText += "\n"
    })

    formattedText += "\n"
  })

  // Use token-based truncation instead of character-based
  formattedText = truncateToTokenLimit(formattedText, maxTokens, locale)

  if (estimateTokenCount(formattedText, locale) >= maxTokens) {
    formattedText += "\n[Context truncated for brevity]"
  }

  return formattedText
}

/**
 * Build context for multiple queries (batch processing)
 * Processes in smaller chunks to control costs
 */
export async function buildBatchSemanticRAGContext(
  queries: string[],
  pageContext: { page: string; slug?: string; locale: string },
  options: SemanticRAGOptions = {},
): Promise<SemanticRAGContext[]> {
  try {
    // Process in smaller chunks to control costs and avoid rate limiting
    const results: SemanticRAGContext[] = []

    for (let i = 0; i < queries.length; i += BATCH_CHUNK_SIZE) {
      const chunk = queries.slice(i, i + BATCH_CHUNK_SIZE)

      // Add delay between chunks to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const chunkResults = await Promise.all(
        chunk.map(query =>
          buildSemanticRAGContext(query, pageContext, options),
        ),
      )

      results.push(...chunkResults)
    }

    return results
  } catch (error) {
    console.error("Error in batch semantic RAG context building:", error)
    throw new Error(
      `Batch semantic RAG context building error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Rebuild all embeddings for a language
 */
export async function rebuildAllEmbeddings(language: string): Promise<void> {
  try {
    console.log(`Starting to rebuild all embeddings for language: ${language}`)

    // Rebuild each content type
    const contentTypes = [
      "faq",
      "page",
      "tour",
      "review",
      "post",
      "home",
      "amenity",
      "pricing_rule",
      "payment_method",
      "cancellation_policy",
      "logistics",
    ]

    for (const contentType of contentTypes) {
      console.log(`Rebuilding embeddings for ${contentType} in ${language}...`)

      await rebuildEmbeddings(contentType, language, async () => {
        const { getContentProcessor } = await import("./document-loaders")
        const processor = getContentProcessor(contentType)

        if (!processor) {
          console.warn(`No processor found for content type: ${contentType}`)
          return []
        }

        return await processor(language)
      })

      console.log(
        `Completed rebuilding embeddings for ${contentType} in ${language}`,
      )
    }

    console.log(`Successfully rebuilt all embeddings for language: ${language}`)
  } catch (error) {
    console.error("Error rebuilding all embeddings:", error)
    throw new Error(
      `Embedding rebuild error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get context statistics
 */
export async function getSemanticRAGStats(): Promise<{
  totalEmbeddings: number
  contentTypes: Record<string, number>
  languages: Record<string, number>
  lastUpdated: string
}> {
  try {
    const { getContentStats } = await import("./vector-store")
    const stats = await getContentStats()

    return {
      totalEmbeddings: stats.totalEmbeddings,
      contentTypes: stats.contentTypeStats,
      languages: stats.languageStats,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error getting semantic RAG stats:", error)
    throw new Error(
      `Stats retrieval error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Validate semantic RAG setup
 */
export async function validateSemanticRAGSetup(): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats?: {
    totalEmbeddings: number
    contentTypes: Record<string, number>
    languages: Record<string, number>
  }
}> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Test 1: Check embedding methods
    console.log("Testing embedding methods...")
    const embeddingTest = await testEmbeddingMethods()

    if (!embeddingTest.local.success && !embeddingTest.remote.success) {
      errors.push("Both local and remote embedding methods failed")
      if (embeddingTest.local.error)
        errors.push(`Local error: ${embeddingTest.local.error}`)
      if (embeddingTest.remote.error)
        errors.push(`Remote error: ${embeddingTest.remote.error}`)
    } else {
      if (!embeddingTest.local.success && embeddingTest.local.error) {
        warnings.push(`Local embedding failed: ${embeddingTest.local.error}`)
      }
      if (!embeddingTest.remote.success && embeddingTest.remote.error) {
        warnings.push(`Remote embedding failed: ${embeddingTest.remote.error}`)
      }
    }

    // Test 2: Check content availability
    console.log("Checking content availability...")
    try {
      const { getContentStats } = await import("./vector-store")
      const stats = await getContentStats()

      if (stats.totalEmbeddings === 0) {
        errors.push(
          "No embeddings found in vector store. Run semantic-rag:init to create embeddings.",
        )
      } else {
        console.log(`Found ${stats.totalEmbeddings} embeddings`)
      }

      // Return stats if validation passes
      const resultStats = {
        totalEmbeddings: stats.totalEmbeddings,
        contentTypes: stats.contentTypeStats,
        languages: stats.languageStats,
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats: resultStats,
      }
    } catch (contentError) {
      errors.push(
        `Failed to access content: ${contentError instanceof Error ? contentError.message : "Unknown error"}`,
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  } catch (error) {
    errors.push(
      `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
    return {
      isValid: false,
      errors,
      warnings,
    }
  }
}

/**
 * Build content type context for semantic RAG
 */
export async function buildContentTypeContext(
  contentType: string,
  language: string,
  query?: string,
): Promise<string> {
  try {
    const { getContentByType } = await import("./vector-store")

    const contexts = await getContentByType(contentType, language, 20)

    if (contexts.length === 0) {
      return `No ${contentType} content found for ${language}.`
    }

    let formattedText = `=== ${contentType.toUpperCase()} CONTENT ===\n\n`

    contexts.forEach((context, index) => {
      formattedText += `${index + 1}. ${context.content}\n`

      if (context.metadata.title) {
        formattedText += `   Title: ${context.metadata.title}\n`
      }
      if (context.metadata.category) {
        formattedText += `   Category: ${context.metadata.category}\n`
      }
      formattedText += "\n"
    })

    return formattedText
  } catch (error) {
    console.error(`Error building ${contentType} context:`, error)
    return `Error retrieving ${contentType} content.`
  }
}

/**
 * Semantic intent detection using vector similarity
 * Works across all supported languages and handles synonyms
 */
async function detectIntentFromQuery(query: string): Promise<string> {
  // Add deduplication to prevent repeated intent detection for same query
  const deduplicationKey = generateDeduplicationKey(
    "detectIntentFromQuery",
    query,
  )

  return deduplicationManager.deduplicate(deduplicationKey, async () => {
    try {
      // Detect language from user query
      const preprocessingResult = preprocessTextWithFallback(query, "auto")
      const detectedLanguage = preprocessingResult.detectedLanguage

      // Get cached intent embeddings for the detected language
      const intentEmbeddings = await getIntentEmbeddings(detectedLanguage)

      // Use cached query embedding to prevent repeated generation
      const queryEmbedding = await getCachedQueryEmbedding(
        query,
        detectedLanguage,
      )

      // Calculate similarity with each intent
      const similarities = Object.entries(intentEmbeddings).map(
        ([intent, embedding]) => ({
          intent,
          similarity: cosineSimilarity(queryEmbedding, embedding),
        }),
      )

      // Sort by similarity and return the best match
      similarities.sort((a, b) => b.similarity - a.similarity)

      const bestMatch = similarities[0]

      // Log similarity scores for debugging (remove in production)
      if (process.env.NODE_ENV === "development") {
        console.log(`Intent detection for "${query}":`, {
          detected: bestMatch.intent,
          confidence: bestMatch.similarity,
          top3: similarities
            .slice(0, 3)
            .map(s => `${s.intent}: ${s.similarity.toFixed(3)}`),
        })
      }

      // Return the best matching intent
      return bestMatch.intent
    } catch (error) {
      console.error(
        "Semantic intent detection failed, falling back to general:",
        error,
      )
      return "general"
    }
  })
}
