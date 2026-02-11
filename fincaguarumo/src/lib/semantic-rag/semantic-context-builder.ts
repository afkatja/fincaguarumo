import {
  createAdaptiveRetrievalChain,
  RetrievedContext,
  createMultiStepRetrievalChain,
} from "./retrieval-chains"
import { processAllDocuments } from "./document-loaders"
import { rebuildEmbeddings } from "./vector-store"
import { getEmbeddingStatus, testEmbeddingMethods } from "./embeddings-hybrid"

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
  maxContextLength?: number
  useMultiStep?: boolean
  includeMetadata?: boolean
  conversationHistory?: Array<{ role: string; content: string }>
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

  const {
    locale = pageContext.locale,
    maxContextLength = 4000,
    useMultiStep = false,
    includeMetadata = true,
    conversationHistory = [],
  } = options

  try {
    // Choose retrieval strategy
    const retrievalResult = useMultiStep
      ? await createMultiStepRetrievalChain(userQuery, {
          language: locale,
          contextSize: 8,
          useHybridSearch: true,
        })
      : {
          primaryContext: await createAdaptiveRetrievalChain(userQuery, {
            language: locale,
            contextSize: 10,
            useHybridSearch: true,
          }),
          intent: {
            primary: "general",
            confidence: 0.5,
            entities: [],
            keywords: [],
          },
        }

    const contexts = [...retrievalResult.primaryContext]

    // Format context for LLM
    const formattedContext = formatContextForLLM(contexts, {
      maxContextLength,
      includeMetadata,
      pageContext,
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
      intent: retrievalResult.intent.primary,
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
 */
function formatContextForLLM(
  contexts: RetrievedContext[],
  options: {
    maxContextLength: number
    includeMetadata: boolean
    pageContext: { page: string; slug?: string; locale: string }
  },
): string {
  const { maxContextLength, includeMetadata, pageContext } = options

  if (contexts.length === 0) {
    return "No specific information found for this query. Please provide general assistance based on your knowledge."
  }

  let formattedText = `=== RELEVANT INFORMATION FROM DATABASE ===\n\n`
  formattedText += `Query Context: User is on ${pageContext.page} page${pageContext.slug ? ` (${pageContext.slug})` : ""} and viewing in ${pageContext.locale}.\n\n`

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

  // Format each content type
  Object.entries(groupedContexts).forEach(([contentType, typeContexts]) => {
    formattedText += `=== ${contentType.toUpperCase()} ===\n`

    typeContexts.forEach((context, index) => {
      formattedText += `\n${index + 1}. ${context.content}\n`

      if (includeMetadata) {
        formattedText += `   Source: ${context.source}\n`
        formattedText += `   Relevance: ${(context.relevanceScore * 100).toFixed(1)}%\n`

        // Add specific metadata based on content type
        if (context.metadata.title) {
          formattedText += `   Title: ${context.metadata.title}\n`
        }
        if (context.metadata.category) {
          formattedText += `   Category: ${context.metadata.category}\n`
        }
        if (context.metadata.priority) {
          formattedText += `   Priority: ${context.metadata.priority}\n`
        }
        if (context.metadata.rating) {
          formattedText += `   Rating: ${context.metadata.rating}/10\n`
        }
        if (context.metadata.price) {
          formattedText += `   Price: $${context.metadata.price}\n`
        }
      }
    })

    formattedText += "\n"
  })

  // Truncate if too long
  if (formattedText.length > maxContextLength) {
    const truncatedText = formattedText.substring(0, maxContextLength - 100)
    formattedText =
      truncatedText +
      "\n\n[Context truncated due to length limit. Most relevant information is shown above.]\n"
  }

  formattedText += "\n=== END OF DATABASE INFORMATION ===\n\n"
  formattedText +=
    "Use this information to provide accurate, helpful responses. If the information doesn't fully answer the user's question, you can supplement with your general knowledge while being clear about what information comes from the database versus general knowledge."

  return formattedText
}

/**
 * Build context for multiple queries (batch processing)
 */
export async function buildBatchSemanticRAGContext(
  queries: string[],
  pageContext: { page: string; slug?: string; locale: string },
  options: SemanticRAGOptions = {},
): Promise<SemanticRAGContext[]> {
  try {
    const results = await Promise.all(
      queries.map(query =>
        buildSemanticRAGContext(query, pageContext, options),
      ),
    )
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
