import {
  extractAllFAQs,
  extractAllTours,
  extractAllReviews,
  extractAllPosts,
  extractAllPages,
  extractHomeContent,
  extractAllAmenities,
  extractAllPricingRules,
  extractAllPaymentMethods,
  extractDefaultCancellationPolicy,
  extractAllLogistics,
} from "./sanity-data-extractor"
import { portableTextToPlain } from "@/sanity/lib/portableTextHelper"
import { validateSemanticRAGSetup } from "./semantic-rag/semantic-context-builder"
import { buildSemanticRAGContext } from "./semantic-rag/semantic-context-builder"
import { generateEmbedding } from "./semantic-rag/embeddings"

export interface RAGContext {
  faqs?: any[]
  pageInfo?: any
  tours?: any[]
  homeInfo?: any
  reviews?: any[]
  posts?: any[]
  averageRating?: any
  amenities?: any[]
  pricingRules?: any[]
  paymentMethods?: any[]
  cancellationPolicy?: any
  logistics?: any[]
}

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
 * Multi-language content type definitions for semantic matching
 */
const CONTENT_TYPE_DEFINITIONS = {
  faq: {
    examples: [
      "questions answers help support frequently asked",
      "preguntas respuestas ayuda soporte preguntas frecuentes",
      "vragen antwoorden hulp ondersteuning veelgestelde vragen",
      "вопросы ответы помощь поддержка часто задаваемые",
      "Fragen Antworten Hilfe Support häufig gestellte Fragen",
    ],
  },
  amenities: {
    examples: [
      "amenities facilities pool wifi features services",
      "amenidades instalaciones piscina wifi características servicios",
      "voorzieningen faciliteiten zwembad wifi kenmerken diensten",
      "удобства бассейн wifi услуги удобства",
      "Annehmlichkeiten Einrichtungen Pool WLAN Funktionen Dienstleistungen",
    ],
  },
  pricing: {
    examples: [
      "pricing cost fee discount rates prices booking",
      "precios costos tarifas descuentos tasas reservación",
      "prijzen kosten tarieven korting boeking",
      "цены стоимость скидки тарифы бронирование",
      "Preise Kosten Gebühr Rabatt Tarife Buchung",
    ],
  },
  tours: {
    examples: [
      "tours activities excursions trips experiences adventures",
      "tours actividades excursiones viajes experiencias aventuras",
      "tochten activiteiten excursies trips ervaringen avonturen",
      "туры активности экскурсии поездки приключения",
      "Touren Aktivitäten Ausflüge Reisen Erlebnisse Abenteuer",
    ],
  },
  reviews: {
    examples: [
      "reviews ratings feedback testimonials opinions comments",
      "reseñas calificaciones comentarios testimonios opiniones",
      "beoordelingen ratings feedback testimonials meningen commentaren",
      "отзывы рейтинги отзывы мнения комментарии",
      "Bewertungen Ratings Feedback Testimonials Meinungen Kommentare",
    ],
  },
  logistics: {
    examples: [
      "logistics transport parking directions check-in arrival",
      "logística transporte estacionamiento direcciones registro llegada",
      "logistiek transport parkeren route inchecken aankomst",
      "логистика транспорт парковка направления регистрация прибытие",
      "Logistik Transport Parken Anreise Check-in Ankunft",
    ],
  },
  cancellation: {
    examples: [
      "cancellation refund modification changes policy terms",
      "cancelación reembolso modificación cambios política términos",
      "annulering teruggave wijziging veranderingen voorwaarden",
      "отмена возврат изменения условия политика",
      "Stornierung Rückerstattung Änderungen Richtlinien Bedingungen",
    ],
  },
  booking: {
    examples: [
      "booking reservation availability dates calendar schedule",
      "reserva disponibilidad fechas calendario horario",
      "boeking beschikbaarheid data kalender schema",
      "бронирование доступность даты календарь расписание",
      "Buchung Verfügbarkeit Termine Kalender Zeitplan",
    ],
  },
  payment: {
    examples: [
      "payment methods credit card paypal bank transfer deposit",
      "métodos de pago tarjeta crédito paypal transferencia bancaria depósito",
      "betaalmethoden creditcard paypal bankoverschrijving aanbetaling",
      "способы оплаты кредитная карта paypal банковский перевод депозит",
      "Zahlungsmethoden Kreditkarte PayPal Banküberweisung Anzahlung",
    ],
  },
  home: {
    examples: [
      "home welcome introduction about property overview summary",
      "inicio bienvenida introducción sobre propiedad resumen general",
      "thuis welkom introductie over eigendom overzicht samenvatting",
      "дом приветствие введение о собственности обзор общая информация",
      "Start Willkommen Einführung über Immobilie Übersicht Zusammenfassung",
    ],
  },
  general: {
    examples: [
      "information details help support contact about property",
      "información detalles ayuda soporte contacto acerca propiedad",
      "informatie details hulp ondersteuning contact over eigendom",
      "информация детали помощь поддержка контакт собственность",
      "Informationen Hilfe Unterstützung Kontakt über Immobilie",
    ],
  },
} as const

/**
 * Cached content type embeddings for performance
 */
let contentTypeEmbeddingsCache: Record<string, number[]> = {}

/**
 * Generate or retrieve cached content type embeddings
 */
async function getContentTypeEmbeddings(): Promise<Record<string, number[]>> {
  if (Object.keys(contentTypeEmbeddingsCache).length > 0) {
    return contentTypeEmbeddingsCache
  }

  console.log("Generating content type embeddings for semantic fallback RAG...")

  for (const [contentType, definition] of Object.entries(
    CONTENT_TYPE_DEFINITIONS,
  )) {
    const combinedExamples = definition.examples.join(" ")

    try {
      const embeddingResult = await generateEmbedding(combinedExamples)
      contentTypeEmbeddingsCache[contentType] = embeddingResult.embedding
    } catch (error) {
      console.error(
        `Failed to generate embedding for content type ${contentType}:`,
        error,
      )
      contentTypeEmbeddingsCache[contentType] = new Array(768).fill(0)
    }
  }

  console.log(
    `Generated embeddings for ${Object.keys(contentTypeEmbeddingsCache).length} content types`,
  )
  return contentTypeEmbeddingsCache
}

/**
 * Detect content type similarity using semantic search
 */
async function detectContentTypeSimilarity(
  queryEmbedding: number[],
  contentText: string,
): Promise<number> {
  try {
    const contentEmbeddingResult = await generateEmbedding(contentText)
    return cosineSimilarity(queryEmbedding, contentEmbeddingResult.embedding)
  } catch (error) {
    console.error("Failed to generate content embedding for similarity:", error)
    return 0
  }
}

/**
 * Semantic content filtering - replaces keyword matching
 */
async function semanticContentFilter(
  items: any[],
  queryEmbedding: number[],
  getTextFunction: (item: any) => string,
  threshold: number = 0.3,
): Promise<any[]> {
  const scoredItems = await Promise.all(
    items.map(async item => {
      const text = getTextFunction(item)
      const similarity = await detectContentTypeSimilarity(queryEmbedding, text)
      return { item, similarity }
    }),
  )

  // Filter by threshold and sort by similarity
  return scoredItems
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ item }) => item)
}

/**
 * Main RAG context builder - tries semantic first, falls back to semantic keyword RAG
 */
export async function buildRAGContext(
  userQuery: string,
  pageContext: { page: string; slug?: string; locale: string },
): Promise<string> {
  try {
    // First, try to validate semantic RAG setup
    const validation = await validateSemanticRAGSetup()

    if (validation.isValid) {
      // Use semantic RAG if available
      console.log("Using semantic RAG for query:", userQuery)
      const semanticContext = await buildSemanticRAGContext(
        userQuery,
        pageContext,
        {
          locale: pageContext.locale,
          useMultiStep: false, // Disable for cost optimization
          includeMetadata: false, // Disable to reduce noise and tokens
          useBatchProcessing: true, // Enable batch processing for cost savings
          modelRole: "primary", // Use appropriate token budget
        },
      )

      return semanticContext.formattedContext
    } else {
      console.warn(
        "Semantic RAG not available, falling back to semantic keyword-based RAG",
      )
      console.warn("Issues:", validation.errors)

      // Fallback to semantic keyword-based approach
      return await buildSemanticKeywordBasedRAGContext(userQuery, pageContext)
    }
  } catch (error) {
    console.error(
      "Error in buildRAGContext, falling back to semantic keyword-based:",
      error,
    )
    return await buildSemanticKeywordBasedRAGContext(userQuery, pageContext)
  }
}

/**
 * Semantic keyword-based RAG context builder (multilingual fallback)
 * Uses semantic similarity instead of English-only keywords
 */
async function buildSemanticKeywordBasedRAGContext(
  userQuery: string,
  pageContext: { page: string; slug?: string; locale: string },
): Promise<string> {
  const context: RAGContext = {}
  let contextText = ""

  // Initialize content type embeddings for performance
  await getContentTypeEmbeddings()

  // Generate query embedding for semantic matching
  const queryEmbeddingResult = await generateEmbedding(userQuery)
  const queryEmbedding = queryEmbeddingResult.embedding

  // Extract relevant FAQs using semantic similarity
  const faqs = await extractAllFAQs()
  const languageFAQs = faqs.filter(
    (faq: any) => faq.language === pageContext.locale,
  )

  const relevantFAQs = await semanticContentFilter(
    languageFAQs,
    queryEmbedding,
    (faq: any) =>
      `${faq.question} ${faq.answer} ${(faq.keywords || []).join(" ")}`,
    0.25, // Lower threshold for broader matching
  )

  // Sort by priority (keep existing logic)
  relevantFAQs.sort((a: any, b: any) => (b.priority || 1) - (a.priority || 1))

  if (relevantFAQs.length > 0) {
    context.faqs = relevantFAQs.slice(0, 8)
    contextText += "\n\n=== RELEVANT FAQs ===\n"
    context.faqs?.forEach((faq: any, i: number) => {
      contextText += `\nQ${i + 1}: ${faq.question}\nA: ${faq.answer}\n`
      if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
        contextText += `Related: ${faq.relatedQuestions.map((rq: any) => rq.question).join(", ")}\n`
      }
    })
  }

  // Semantic amenities context
  const amenities = await extractAllAmenities()
  const languageAmenities = amenities.filter(
    (amenity: any) => amenity.language === pageContext.locale,
  )

  const relevantAmenities = await semanticContentFilter(
    languageAmenities,
    queryEmbedding,
    (amenity: any) =>
      `${amenity.title} ${amenity.description} ${amenity.category} ${(amenity.keywords || []).join(" ")}`,
    0.3,
  )

  if (relevantAmenities.length > 0) {
    context.amenities = relevantAmenities.slice(0, 10)
    contextText += "\n\n=== AMENITIES & FEATURES ===\n"
    context.amenities?.forEach((amenity: any, i: number) => {
      contextText += `\n${i + 1}. ${amenity.title} (${amenity.category})\n`
      contextText += `   ${amenity.description}\n`
      if (amenity.isFeatured) contextText += "   ⭐ Featured\n"
    })
  }

  // Semantic pricing context
  const pricingRules = await extractAllPricingRules()
  const languagePricing = pricingRules.filter(
    (rule: any) => rule.language === pageContext.locale,
  )

  const relevantPricing = await semanticContentFilter(
    languagePricing,
    queryEmbedding,
    (rule: any) =>
      `${rule.title} ${rule.description} ${rule.ruleType} ${rule.season || ""}`,
    0.3,
  )

  if (relevantPricing.length > 0) {
    context.pricingRules = relevantPricing.slice(0, 6)
    contextText += "\n\n=== PRICING INFORMATION ===\n"
    context.pricingRules?.forEach((rule: any, i: number) => {
      contextText += `\n${i + 1}. ${rule.title}\n`
      contextText += `   Type: ${rule.ruleType}\n`
      if (rule.season) contextText += `   Season: ${rule.season}\n`
      contextText += `   ${rule.description}\n`
    })
  }

  // Semantic tours context
  const tours = await extractAllTours()
  const languageTours = tours.filter(
    (tour: any) => tour.language === pageContext.locale,
  )

  const relevantTours = await semanticContentFilter(
    languageTours,
    queryEmbedding,
    (tour: any) =>
      `${tour.title} ${tour.description} ${(tour.keywords || []).join(" ")}`,
    0.3,
  )

  if (relevantTours.length > 0) {
    context.tours = relevantTours.slice(0, 6)
    contextText += "\n\n=== AVAILABLE TOURS ===\n"
    context.tours?.forEach((tour: any, i: number) => {
      contextText += `\n${i + 1}. ${tour.title}\n`
      contextText += `   ${tour.description}\n`
      if (tour.duration) contextText += `   Duration: ${tour.duration}\n`
      if (tour.price) contextText += `   Price: $${tour.price}\n`
    })
  }

  // Semantic reviews context
  const reviews = await extractAllReviews()
  const languageReviews = reviews.filter(
    (review: any) => review.language === pageContext.locale,
  )

  const relevantReviews = await semanticContentFilter(
    languageReviews,
    queryEmbedding,
    (review: any) =>
      `${review.title || ""} ${review.comment || ""} ${review.rating || ""}`,
    0.3,
  )

  if (relevantReviews.length > 0) {
    context.reviews = relevantReviews.slice(0, 6)
    contextText += "\n\n=== GUEST REVIEWS ===\n"
    context.reviews?.forEach((review: any, i: number) => {
      contextText += `\n${i + 1}. ${review.title || "Review"}\n`
      if (review.rating) contextText += `   Rating: ${review.rating}/5\n`
      if (review.comment) {
        const truncatedComment =
          review.comment.length > 200
            ? review.comment.substring(0, 200) + "..."
            : review.comment
        contextText += `   ${truncatedComment}\n`
      }
      if (review.guestName) contextText += `   Guest: ${review.guestName}\n`
    })

    // Add average rating if available
    if (context.reviews && context.reviews.length > 0) {
      const avgRating =
        context.reviews.reduce(
          (sum: number, r: any) => sum + (r.rating || 0),
          0,
        ) / context.reviews.length
      context.averageRating = avgRating
      contextText += `\nAverage Rating: ${avgRating.toFixed(1)}/5\n`
    }
  }

  // Semantic logistics context
  const logistics = await extractAllLogistics()
  const languageLogistics = logistics.filter(
    (logistic: any) => logistic.language === pageContext.locale,
  )

  const relevantLogistics = await semanticContentFilter(
    languageLogistics,
    queryEmbedding,
    (logistic: any) =>
      `${logistic.title} ${logistic.description} ${(logistic.keywords || []).join(" ")}`,
    0.3,
  )

  if (relevantLogistics.length > 0) {
    context.logistics = relevantLogistics.slice(0, 6)
    contextText += "\n\n=== LOGISTICS INFORMATION ===\n"
    context.logistics?.forEach((logistic: any, i: number) => {
      contextText += `\n${i + 1}. ${logistic.title}\n`
      contextText += `   ${logistic.description}\n`
    })
  }

  // Semantic cancellation policy context
  const cancellationPolicy = await extractDefaultCancellationPolicy()
  const languageCancellation =
    cancellationPolicy?.filter(
      (policy: any) => policy.language === pageContext.locale,
    ) || []

  const relevantCancellation = await semanticContentFilter(
    languageCancellation,
    queryEmbedding,
    (policy: any) =>
      `${policy.title} ${policy.description} ${policy.policy || ""}`,
    0.3,
  )

  if (relevantCancellation.length > 0) {
    context.cancellationPolicy = relevantCancellation[0]
    contextText += "\n\n=== CANCELLATION POLICY ===\n"
    const policy = relevantCancellation[0]
    contextText += `\n${policy.title}\n`
    contextText += `${policy.description}\n`
    if (policy.policy) {
      const truncatedPolicy =
        policy.policy.length > 300
          ? policy.policy.substring(0, 300) + "..."
          : policy.policy
      contextText += `${truncatedPolicy}\n`
    }
  }

  // Semantic blog posts context
  const posts = await extractAllPosts()
  const languagePosts = posts.filter(
    (post: any) => post.language === pageContext.locale,
  )

  const relevantPosts = await semanticContentFilter(
    languagePosts,
    queryEmbedding,
    (post: any) =>
      `${post.title} ${portableTextToPlain(post.body || "")} ${(post.categories || []).map((c: any) => c.title).join(" ")}`,
    0.25,
  )

  if (relevantPosts.length > 0) {
    context.posts = relevantPosts.slice(0, 4)
    contextText += "\n\n=== BLOG POSTS ===\n"
    context.posts?.forEach((post: any, i: number) => {
      contextText += `\n${i + 1}. ${post.title}\n`
      if (post.author) contextText += `   Author: ${post.author.name}\n`
      if (post.publishedAt)
        contextText += `   Published: ${new Date(post.publishedAt).toLocaleDateString()}\n`
      if (post.categories && post.categories.length > 0) {
        contextText += `   Categories: ${post.categories.map((c: any) => c.title).join(", ")}\n`
      }
      // Add a brief excerpt
      if (post.body) {
        const plainText = portableTextToPlain(post.body)
        const excerpt =
          plainText.length > 150
            ? plainText.substring(0, 150) + "..."
            : plainText
        contextText += `   Excerpt: ${excerpt}\n`
      }
    })
  }

  // Semantic payment methods context
  const paymentMethods = await extractAllPaymentMethods()
  const languagePaymentMethods = paymentMethods.filter(
    (method: any) => method.language === pageContext.locale,
  )

  const relevantPaymentMethods = await semanticContentFilter(
    languagePaymentMethods,
    queryEmbedding,
    (method: any) =>
      `${method.title} ${method.description} ${(method.keywords || []).join(" ")}`,
    0.3,
  )

  if (relevantPaymentMethods.length > 0) {
    context.paymentMethods = relevantPaymentMethods.slice(0, 6)
    contextText += "\n\n=== PAYMENT METHODS ===\n"
    context.paymentMethods?.forEach((method: any, i: number) => {
      contextText += `\n${i + 1}. ${method.title}\n`
      contextText += `   ${method.description}\n`
      if (method.type) contextText += `   Type: ${method.type}\n`
      if (method.fees) contextText += `   Fees: ${method.fees}\n`
    })
  }

  // Semantic home content context
  const homeContent = await extractHomeContent()
  const languageHomeContent = homeContent.filter(
    (home: any) => home.language === pageContext.locale,
  )

  const relevantHomeContent = await semanticContentFilter(
    languageHomeContent,
    queryEmbedding,
    (home: any) =>
      `${home.title || ""} ${home.welcomeMessage || ""} ${home.introduction || ""} ${home.overview || ""}`,
    0.25,
  )

  if (relevantHomeContent.length > 0) {
    context.homeInfo = relevantHomeContent[0]
    contextText += "\n\n=== HOME INFORMATION ===\n"
    const home = relevantHomeContent[0]
    contextText += `\n${home.title || "Welcome"}\n`
    if (home.welcomeMessage) {
      const truncatedWelcome =
        home.welcomeMessage.length > 200
          ? home.welcomeMessage.substring(0, 200) + "..."
          : home.welcomeMessage
      contextText += `${truncatedWelcome}\n`
    }
    if (home.introduction) {
      const truncatedIntro =
        home.introduction.length > 200
          ? home.introduction.substring(0, 200) + "..."
          : home.introduction
      contextText += `${truncatedIntro}\n`
    }
    if (home.overview) {
      const truncatedOverview =
        home.overview.length > 200
          ? home.overview.substring(0, 200) + "..."
          : home.overview
      contextText += `${truncatedOverview}\n`
    }
  }

  // Add basic page information
  const pages = await extractAllPages()
  const languagePages = pages.filter(
    (page: any) => page.language === pageContext.locale,
  )

  const relevantPages = await semanticContentFilter(
    languagePages,
    queryEmbedding,
    (page: any) =>
      `${page.title} ${page.subtitle || ""} ${page.description || ""}`,
    0.25,
  )

  if (relevantPages.length > 0) {
    context.pageInfo = relevantPages[0]
    contextText += "\n\n=== PROPERTY INFORMATION ===\n"
    const page = relevantPages[0]
    contextText += `\n${page.title}\n`
    if (page.subtitle) contextText += `${page.subtitle}\n`
    if (page.description) contextText += `${page.description}\n`
  }

  // Return context or fallback message
  if (contextText.trim()) {
    return contextText.trim()
  } else {
    return "No specific information found. Please provide general assistance based on your knowledge."
  }
}
