import { QdrantClient } from "@qdrant/js-client-rest"
import { generateEmbedding } from "./embeddings"
import { estimateTokenCount, getTokenBudget } from "./token-utils"
import { languages } from "../../config"

// Unified content types used across all benchmark functions
const CONTENT_TYPES = [
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
] as const

// Benchmark configuration
const BENCHMARK_CONFIG = {
  // Test data sizes
  testSizes: [100, 500, 1000],

  // Vector dimensions (e5-base-instruct)
  vectorDimensions: 768,

  // Number of test runs for each configuration
  testRuns: 3,

  // Search parameters
  searchK: 5, // Reduced from 10 to 5 for faster testing
  searchThreshold: 0.7,

  // Batch chunk size for processing
  batchChunkSize: 3,

  // Dry run mode - use mock embeddings for large test sizes
  dryRunThreshold: 500, // Use mock embeddings above this size

  // Performance thresholds (in milliseconds)
  maxIndexingTime: 10000, // 10 seconds per 1000 vectors
  maxSearchTime: 1000, // 1 second per search
  maxMemoryUsage: 500, // 500MB

  // Binary quantization effectiveness thresholds
  minCompressionRatio: 0.5, // Should compress by at least 50%
  maxSearchQualityLoss: 0.1, // Search quality should not degrade by more than 10%

  // Cost optimization thresholds
  maxTokensPerQuery: getTokenBudget("primary"),
  maxTokensBatch: getTokenBudget("tools"),
}

export interface BenchmarkResult {
  testSize: number
  configuration: string
  indexingTimeMs: number
  indexSizeMB: number
  isEstimated: boolean
  searchTimeMs: number
  searchAccuracy: number
  compressionRatio: number
  memoryUsageMB: number
  throughputVectorsPerSecond: number
  // Cost optimization metrics
  avgTokensPerQuery: number
  avgCostPerQuery?: number
  batchProcessingTime?: number
  contextReductionRatio?: number
}

export interface BenchmarkSummary {
  results: BenchmarkResult[]
  averageIndexingTime: number
  averageSearchTime: number
  averageCompressionRatio: number
  averageSearchAccuracy: number
  averageTokensPerQuery: number
  averageCostPerQuery?: number
  recommendations: string[]
  costOptimizations: string[]
}

/**
 * Calculate realistic cost with budget-aware optimization analysis
 */
function calculateActualCost(tokens: number): {
  cost: number
  primaryBudgetAnalysis: {
    isOverBudget: boolean
    budgetExceededBy: number
    utilization: number
  }
  toolsBudgetAnalysis: {
    isOverBudget: boolean
    budgetExceededBy: number
    utilization: number
  }
  recommendations: string[]
} {
  // Use token budgets for cost optimization
  const primaryBudget = getTokenBudget("primary") // LLM context budget
  const toolsBudget = getTokenBudget("tools") // Embedding budget

  // Realistic pricing model based on common LLM providers
  // Embedding cost: ~$0.0001 per 1K tokens
  const embeddingCostPerToken = 0.0000001

  // LLM cost: ~$0.002 per 1K tokens for input + ~$0.002 per 1K tokens for output
  // Assuming output is ~25% of input length
  const inputTokens = tokens
  const outputTokens = Math.ceil(tokens * 0.25)
  const llmCostPerToken = 0.000004 // Combined input + output

  // Separate cost calculations
  const embeddingCost = tokens * embeddingCostPerToken
  const llmCost = (inputTokens + outputTokens) * llmCostPerToken
  const totalCost = embeddingCost + llmCost

  // Budget analysis for primary (LLM context)
  const primaryBudgetExceeded = tokens > primaryBudget
  const primaryBudgetExceededBy = primaryBudgetExceeded
    ? ((tokens - primaryBudget) / primaryBudget) * 100
    : 0
  const primaryUtilization = (tokens / primaryBudget) * 100

  // Budget analysis for tools (embeddings)
  const toolsBudgetExceeded = tokens > toolsBudget
  const toolsBudgetExceededBy = toolsBudgetExceeded
    ? ((tokens - toolsBudget) / toolsBudget) * 100
    : 0
  const toolsUtilization = (tokens / toolsBudget) * 100

  // Cost optimization recommendations
  const recommendations: string[] = []

  // Primary budget recommendations (LLM context)
  if (primaryBudgetExceeded) {
    recommendations.push(
      `⚠️  LLM Context: Exceeds primary budget by ${primaryBudgetExceededBy.toFixed(1)}%`,
    )

    if (tokens > primaryBudget * 1.5) {
      recommendations.push(
        "🔧 Consider binary quantization for 50%+ cost reduction",
      )
    }

    if (tokens > primaryBudget * 1.2) {
      recommendations.push(
        "📉 Reduce context size or implement aggressive truncation",
      )
    }

    recommendations.push("🗜️  Enable context compression to reduce token usage")
  } else {
    recommendations.push(
      `✅ LLM Context: Within primary budget (${primaryUtilization.toFixed(1)}% utilization)`,
    )
  }

  // Tools budget recommendations (embeddings)
  if (toolsBudgetExceeded) {
    recommendations.push(
      `⚠️  Embeddings: Exceeds tools budget by ${toolsBudgetExceededBy.toFixed(1)}%`,
    )

    if (tokens > toolsBudget * 1.3) {
      recommendations.push("🔄 Consider embedding caching for repeated queries")
    }

    recommendations.push(
      "💾 Use batch embedding processing to reduce per-token costs",
    )
  } else {
    recommendations.push(
      `✅ Embeddings: Within tools budget (${toolsUtilization.toFixed(1)}% utilization)`,
    )
  }

  return {
    cost: totalCost,
    primaryBudgetAnalysis: {
      isOverBudget: primaryBudgetExceeded,
      budgetExceededBy: primaryBudgetExceededBy,
      utilization: primaryUtilization,
    },
    toolsBudgetAnalysis: {
      isOverBudget: toolsBudgetExceeded,
      budgetExceededBy: toolsBudgetExceededBy,
      utilization: toolsUtilization,
    },
    recommendations,
  }
}

/**
 * Measure actual token usage and context reduction with budget-aware cost analysis
 */
async function measureActualTokenUsage(testSize: number): Promise<{
  avgTokensPerQuery: number
  contextReductionRatio: number
  costAnalysis: {
    primaryOverBudget: boolean
    primaryBudgetExceededBy: number
    toolsOverBudget: boolean
    toolsBudgetExceededBy: number
    costOptimizations: string[]
  }
}> {
  try {
    // Import the semantic context builder
    const { buildSemanticRAGContext } =
      await import("./semantic-context-builder")

    // Use realistic multilingual test queries with proper locale handling
    const baseQueries = [
      { text: "How much does it cost per night?", locale: "en" },
      { text: "¿Cuánto cuesta por noche?", locale: "es" },
      { text: "Is there a swimming pool at the villa?", locale: "en" },
      { text: "¿Hay piscina en la villa?", locale: "es" },
      { text: "What tours are available in the area?", locale: "en" },
      { text: "¿Qué tours hay en la zona?", locale: "es" },
      { text: "What is the cancellation policy?", locale: "en" },
      { text: "¿Cuál es la política de cancelación?", locale: "es" },
      { text: "Can I pay with credit card?", locale: "en" },
      { text: "¿Puedo pagar con tarjeta de crédito?", locale: "es" },
      { text: "Hoe laat is het inchecken?", locale: "nl" },
      { text: "Was kostet die Übernachtung?", locale: "de" },
      { text: "Во сколько регистрация?", locale: "ru" },
      { text: "Есть ли бассейн?", locale: "ru" },
    ]

    // Token measurement doesn't depend on collection size, so use fixed query set
    // testSize only influences indexing/search benchmarks, not token measurement
    const queriesToTest = baseQueries.slice(0, Math.min(baseQueries.length, 14))

    let totalFinalTokens = 0
    let totalRawTokens = 0
    let queryCount = 0

    for (const query of queriesToTest) {
      try {
        // Create proper pageContext for each query locale
        const pageContext = {
          page: "home",
          slug: undefined,
          locale: query.locale,
        }

        // Measure tokens before and after the call
        const startTime = Date.now()

        // Call the actual semantic RAG context builder with proper locale
        const result = await buildSemanticRAGContext(query.text, pageContext, {
          locale: query.locale,
          useMultiStep: false,
          includeMetadata: false,
          useBatchProcessing: true,
          modelRole: "primary",
        })

        const endTime = Date.now()

        // Estimate raw token count (before truncation) - simulate from contexts
        const rawTokens = estimateTokenCount(
          result.contexts?.map(c => c.content || "").join("\n\n") || "",
          query.locale,
        )

        // Estimate final token count (after formatting/truncation)
        const finalTokens = estimateTokenCount(
          result.formattedContext,
          query.locale,
        )

        totalRawTokens += rawTokens
        totalFinalTokens += finalTokens
        queryCount++

        console.log(
          `Query "${query.text.substring(0, 30)}..." (${query.locale}): ${finalTokens} tokens (raw: ${rawTokens}), ${endTime - startTime}ms`,
        )
      } catch (error) {
        console.error(
          `Failed to measure tokens for query "${query.text}":`,
          error,
        )
        // Continue with other queries
      }
    }

    if (queryCount === 0) {
      console.warn("No successful token measurements, using fallback estimate")
      const fallbackTokens = 1500
      const costAnalysis = calculateActualCost(fallbackTokens)
      return {
        avgTokensPerQuery: fallbackTokens,
        contextReductionRatio: 0.3, // Fallback estimate
        costAnalysis: {
          primaryOverBudget: costAnalysis.primaryBudgetAnalysis.isOverBudget,
          primaryBudgetExceededBy:
            costAnalysis.primaryBudgetAnalysis.budgetExceededBy,
          toolsOverBudget: costAnalysis.toolsBudgetAnalysis.isOverBudget,
          toolsBudgetExceededBy:
            costAnalysis.toolsBudgetAnalysis.budgetExceededBy,
          costOptimizations: costAnalysis.recommendations,
        },
      }
    }

    const avgFinalTokens = totalFinalTokens / queryCount
    const avgRawTokens = totalRawTokens / queryCount
    const reductionRatio =
      avgRawTokens > 0 ? (avgRawTokens - avgFinalTokens) / avgRawTokens : 0

    console.log(
      `Average final tokens per query: ${avgFinalTokens.toFixed(0)} (tested ${queryCount} distinct queries)`,
    )
    console.log(`Average raw tokens per query: ${avgRawTokens.toFixed(0)}`)
    console.log(
      `Context reduction ratio: ${(reductionRatio * 100).toFixed(1)}%`,
    )
    console.log(
      `Note: Token measurement uses fixed query set (independent of testSize)`,
    )

    // Perform cost analysis with budget awareness
    const costAnalysis = calculateActualCost(avgFinalTokens)

    return {
      avgTokensPerQuery: avgFinalTokens,
      contextReductionRatio: reductionRatio,
      costAnalysis: {
        primaryOverBudget: costAnalysis.primaryBudgetAnalysis.isOverBudget,
        primaryBudgetExceededBy:
          costAnalysis.primaryBudgetAnalysis.budgetExceededBy,
        toolsOverBudget: costAnalysis.toolsBudgetAnalysis.isOverBudget,
        toolsBudgetExceededBy:
          costAnalysis.toolsBudgetAnalysis.budgetExceededBy,
        costOptimizations: costAnalysis.recommendations,
      },
    }
  } catch (error) {
    console.error("Failed to measure actual token usage:", error)
    // Return a reasonable fallback based on typical RAG context sizes
    const fallbackTokens = 1500
    const costAnalysis = calculateActualCost(fallbackTokens)
    return {
      avgTokensPerQuery: fallbackTokens,
      contextReductionRatio: 0.3, // Fallback estimate
      costAnalysis: {
        primaryOverBudget: costAnalysis.primaryBudgetAnalysis.isOverBudget,
        primaryBudgetExceededBy:
          costAnalysis.primaryBudgetAnalysis.budgetExceededBy,
        toolsOverBudget: costAnalysis.toolsBudgetAnalysis.isOverBudget,
        toolsBudgetExceededBy:
          costAnalysis.toolsBudgetAnalysis.budgetExceededBy,
        costOptimizations: costAnalysis.recommendations,
      },
    }
  }
}

/**
 * Generate test embeddings for benchmarking
 */
async function generateTestEmbeddings(count: number): Promise<
  Array<{
    id: string
    content: string
    label: string
    embedding: number[]
    language: string
  }>
> {
  const embeddings = []
  const categories = CONTENT_TYPES

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length]
    let content = ""

    // Generate balanced multilingual content for fair accuracy testing
    const contentVariations = {
      faq: [
        {
          lang: "en",
          text: "What time is check-in and check-out? Check-in is at 3:00 PM and check-out is at 11:00 AM. Early check-in may be available upon request.",
        },
        {
          lang: "es",
          text: "¿Hay wifi disponible en la propiedad? Sí, ofrecemos wifi gratuito en todas las áreas comunes. La señal puede ser variable debido a nuestra ubicación en la jungla.",
        },
        {
          lang: "nl",
          text: "Is de accommodatie geschikt voor kinderen? Ja, we verwelkomen families met kinderen. We kunnen extra bedden en kindvriendelijke voorzieningen bieden.",
        },
        {
          lang: "de",
          text: "Um wie viel Uhr ist der Check-in? Der Check-in ist um 15:00 Uhr und der Check-out um 11:00 Uhr. Früherer Check-in auf Anfrage möglich.",
        },
        {
          lang: "ru",
          text: "Есть ли вилла для детей? Да, мы рады семьям с детьми. Можем предоставить дополнительные кровати и удобства для детей.",
        },
      ],
      page: [
        {
          lang: "en",
          text: "Finca Guarumo - An eco-luxury villa nestled in Costa Rica's tropical jungle. Experience sustainable luxury with modern amenities and pristine natural surroundings.",
        },
        {
          lang: "es",
          text: "Finca Guarumo - Villa ecológica de lujo en la jungla de Costa Rica. Experimente el lujo sostenible con comodidades modernas y alrededores naturales prístinos.",
        },
        {
          lang: "nl",
          text: "Finca Guarumo - Een eco-luxe villa verscholen in de tropische jungle van Costa Rica. Ervaar duurzaam luxe met moderne voorzieningen en prachtige natuur.",
        },
        {
          lang: "de",
          text: "Finca Guarumo - Eine Eco-Luxus-Villa im Herzen des costa-ricanischen Dschungels. Erleben Sie nachhaltigen Luxus mit modernen Annehmlichkeiten.",
        },
        {
          lang: "ru",
          text: "Finca Guarumo - Эко-люксовая вилла в тропических джунглях Коста-Рики. Испытайте устойчивую роскошь с современными удобствами.",
        },
      ],
      tour: [
        {
          lang: "en",
          text: "Wildlife Sanctuary Tour - Explore the rich biodiversity of Costa Rica. Expert guides will show you native birds, monkeys, and tropical plants. Duration: 3 hours.",
        },
        {
          lang: "es",
          text: "Tour de la Cascada Escondida - Caminata guiada hasta una cascada secreta. Incluye snack y transporte. Duración: 4 horas, $45 por persona.",
        },
        {
          lang: "nl",
          text: "Wildlife Tour - Ontdek de rijke biodiversiteit van Costa Rica. Expertgidsen laten u inheemse vogels, apen en tropische planten zien.",
        },
        {
          lang: "de",
          text: "Wildtier-Tour - Erkunden Sie die reiche Biodiversität Costa Ricas. Expertenführer zeigen Ihnen einheimische Vögel, Affen und tropische Pflanzen.",
        },
        {
          lang: "ru",
          text: "Тур по дикой природе - Исследуйте богатое биоразнообразие Коста-Рики. Эксперт-гиды покажут местных птиц, обезьян и тропические растения.",
        },
      ],
      review: [
        {
          lang: "en",
          text: "Amazing eco-lodge experience! The property is beautifully maintained and the staff is incredibly helpful. Waking up to howler monkeys was unforgettable. 5/5 stars.",
        },
        {
          lang: "es",
          text: "¡Experiencia increíble! La finca es un paraíso escondido. Los anfitriones son maravillosos y el desayuno casero es delicioso. Definitivamente volveremos.",
        },
        {
          lang: "nl",
          text: "Fantastische eco-lodge ervaring! Het eigendom is prachtig onderhouden en het personeel is ongelooflijk behulpzaam. Wakker worden met brulapen was onvergetelijk.",
        },
        {
          lang: "de",
          text: "Unglaubliche Eco-Lodge-Erfahrung! Das Anwesen ist wunderschön gepflegt und das Personal ist unglaublich hilfsbereit. Aufwachen mit Brüllaffen war unvergesslich.",
        },
        {
          lang: "ru",
          text: "Потрясающий опыт в эко-лодже! Владение прекрасно поддерживается, а персонал невероятно полезен. Просыпаться с ревунами было незабываемо.",
        },
      ],
      post: [
        {
          lang: "en",
          text: "Sustainable Living in Costa Rica - How eco-lodges like Finca Guarumo are leading the way in responsible tourism while providing luxury experiences.",
        },
        {
          lang: "es",
          text: "Guía de Montezuma - Todo lo que necesitas saber sobre este encantador pueblo costero: playas, restaurantes, actividades y consejos locales.",
        },
        {
          lang: "nl",
          text: "Duurzaam Leven in Costa Rica - Hoe eco-lodges zoals Finca Guarumo de weg wijzen in verantwoord toerisme terwijl ze luxe-ervaringen bieden.",
        },
        {
          lang: "de",
          text: "Nachhaltiges Leben in Costa Rica - Wie Eco-Lodges wie Finca Guarumo den Weg weisen im verantwortungsvollen Tourismus mit Luxus-Erlebnissen.",
        },
        {
          lang: "ru",
          text: "Устойчивая жизнь в Коста-Рике - Как эко-лоджи, такие как Finca Guarumo, ведут путь в ответственный туризм с роскошными впечатлениями.",
        },
      ],
      home: [
        {
          lang: "en",
          text: "Welcome to Finca Guarumo - Your sustainable jungle retreat. Experience the perfect balance of luxury and nature in the heart of Costa Rica's stunning wilderness.",
        },
        {
          lang: "es",
          text: "Bienvenidos a Finca Guarumo - Su refugio sostenible en la jungla. Descubra el equilibrio perfecto entre lujo y naturaleza en el corazón de la Costa Rica salvaje.",
        },
        {
          lang: "nl",
          text: "Welkom bij Finca Guarumo - Uw duurzame jungle retreat. Ervaar de perfecte balans tussen luxe en natuur in het hart van de prachtige wildernis van Costa Rica.",
        },
        {
          lang: "de",
          text: "Willkommen in Finca Guarumo - Ihr nachhaltiger Dschungel-Rückzugsort. Erleben Sie die perfekte Balance zwischen Luxus und Natur im Herzen Costa Ricas.",
        },
        {
          lang: "ru",
          text: "Добро пожаловать в Finca Guarumo - Ваш устойчивый джунглевый ретрит. Испытайте идеальный баланс между роскошью и природой в сердце Коста-Рики.",
        },
      ],
      amenity: [
        {
          lang: "en",
          text: "Infinity Pool - Our saltwater pool offers stunning jungle views while you swim. No chlorine used - filled with natural spring water. Perfect for relaxation.",
        },
        {
          lang: "es",
          text: "Yoga Deck - Comience su día con yoga al amanecer en nuestra terraza dedicada. Rodeado de jardines tropicales y los sonidos de la naturaleza.",
        },
        {
          lang: "nl",
          text: "Buitenkeuken - Volledig uitgeruste keukenruimte voor buiten dineren. Inclusief BBQ-grill, pizza-oven en eethoek voor 8 gasten.",
        },
        {
          lang: "de",
          text: "Yoga-Deck - Starten Sie Ihren Tag mit Sonnenaufgang-Yoga auf unserer dedizierten Terrasse. Umgeben von tropischen Gärten und den Geräuschen der Natur.",
        },
        {
          lang: "ru",
          text: "Кухня на открытом воздухе - Полностью оборудованная кухонная зона для обедов на свежем воздухе. Включает гриль, печь для пиццы и обеденную зону.",
        },
      ],
      pricing_rule: [
        {
          lang: "en",
          text: "Seasonal Rates - High Season (Dec-Apr): $200/night. Green Season (May-Nov): $150/night. Weekly stays receive 10% discount.",
        },
        {
          lang: "es",
          text: "Tarifas de Temporada - Temporada Alta (Dic-Abr): $200/noche. Temporada Verde (May-Nov): $150/noche. Estancias semanales con 10% descuento.",
        },
        {
          lang: "nl",
          text: "Seizoentarieven - Hoogseizoen (Dec-Apr): $200/nacht. Groenseizoen (May-Nov): $150/nacht. Wekelijkse verblijven ontvangen 10% korting.",
        },
        {
          lang: "de",
          text: "Saisonpreise - Hauptsaison (Dez-Apr): $200/Nacht. Grünsaison (Mai-Nov): $150/Nacht. Wöchentliche Aufenthalte erhalten 10% Rabatt.",
        },
        {
          lang: "ru",
          text: "Сезонные тарифы - Высокий сезон (Дек-Апр): $200/ночь. Зеленый сезон (Май-Ноябрь): $150/ночь. Недельные пребывания получают 10% скидку.",
        },
      ],
      payment_method: [
        {
          lang: "en",
          text: "Bank Transfer - We accept local and international bank transfers. No processing fees. Payments accepted in USD or Costa Rican colones.",
        },
        {
          lang: "es",
          text: "Efectivo - Aceptamos pagos en efectivo al llegar. También aceptamos dólares estadounidenses y colones costarricenses.",
        },
        {
          lang: "nl",
          text: "Bankoverschrijving - We accepteren lokale en internationale bankoverschrijvingen. Geen verwerkingskosten. Betalingen geaccepteerd in USD en Costa Ricaanse colones.",
        },
        {
          lang: "de",
          text: "Banküberweisung - Wir akzeptieren lokale und internationale Banküberweisungen. Keine Bearbeitungsgebühren. Zahlungen in USD und costa-ricanischen Colones akzeptiert.",
        },
        {
          lang: "ru",
          text: "Банковский перевод - Мы принимаем местные и международные банковские переводы. Без комиссий за обработку. Платежи принимаются в USD и коста-риканских колонах.",
        },
      ],
      cancellation_policy: [
        {
          lang: "en",
          text: "Flexible Cancellation - Free cancellation up to 14 days before arrival. 50% refund 7-13 days before. No refunds within 7 days.",
        },
        {
          lang: "es",
          text: "Política Flexible - Cancelación gratuita hasta 14 días antes. Reembolso del 50% entre 7-13 días. Sin reembolso dentro de 7 días.",
        },
        {
          lang: "nl",
          text: "Flexibele Annulering - Gratis annulering tot 14 dagen voor aankomst. 50% terugbetaling 7-13 dagen voor. Geen terugbetaling binnen 7 dagen.",
        },
        {
          lang: "de",
          text: "Flexible Stornierung - Kostenlose Stornierung bis 14 Tage vor Ankunft. 50% Rückerstattung 7-13 Tage vor. Keine Rückerstattung innerhalb von 7 Tagen.",
        },
        {
          lang: "ru",
          text: "Гибкая отмена - Бесплатная отмена до 14 дней до прибытия. 50% возврат за 7-13 дней до. Без возврата в течение 7 дней.",
        },
      ],
      logistics: [
        {
          lang: "en",
          text: "Airport Transfers - We arrange private transportation from San José (SJO) airport. 2.5 hour scenic drive to the property. $120 each way.",
        },
        {
          lang: "es",
          text: "Transporte Local - Se recomienda vehículo 4x4 para el tramo final. Podemos organizar alquileres o proporcionar transporte desde pueblos cercanos.",
        },
        {
          lang: "nl",
          text: "Lokaal Vervoer - 4x4 voertuig aanbevolen voor het laatste stuk. We kunnen autoverhuur regelen of vervoer bieden vanuit nabijgelegen steden.",
        },
        {
          lang: "de",
          text: "Lokaler Transport - 4x4-Fahrzeug für den letzten Abschnitt empfohlen. Wir können Mietwagen organisieren oder Transport aus naheliegenden Städten bereitstellen.",
        },
        {
          lang: "ru",
          text: "Местный транспорт - Рекомендуется автомобиль 4x4 для последнего участка. Мы можем организовать аренду или предоставить транспорт из близлежащих городов.",
        },
      ],
    }

    // Get content variations for this category and cycle through them
    let contentLanguage = "en"
    if (contentVariations[category as keyof typeof contentVariations]) {
      const variations =
        contentVariations[category as keyof typeof contentVariations]
      const variation = variations[i % variations.length]
      content = variation.text
      contentLanguage = variation.lang
    } else {
      content = `${category} content for benchmarking item ${i}. This is sample text about ${category} for performance testing and evaluation.`
    }

    // Use mock embeddings for large test sizes to avoid expensive API calls
    const useMockEmbedding = count > BENCHMARK_CONFIG.dryRunThreshold

    if (useMockEmbedding) {
      console.log(
        `Using mock embeddings for test size ${count} (threshold: ${BENCHMARK_CONFIG.dryRunThreshold})`,
      )
      // Generate mock embedding
      embeddings.push({
        id: `test_${i}`,
        content,
        label: category,
        embedding: Array.from(
          { length: BENCHMARK_CONFIG.vectorDimensions },
          () => Math.random() - 0.5,
        ),
        language: contentLanguage,
      })
    } else {
      try {
        const result = await generateEmbedding(content, contentLanguage)
        embeddings.push({
          id: `test_${i}`,
          content,
          label: category,
          embedding: result.embedding,
          language: contentLanguage,
        })
      } catch (error) {
        console.error(`Failed to generate embedding for test item ${i}:`, error)
        // Use a mock embedding as fallback
        embeddings.push({
          id: `test_${i}`,
          content,
          label: category,
          embedding: Array.from(
            { length: BENCHMARK_CONFIG.vectorDimensions },
            () => Math.random() - 0.5,
          ),
          language: contentLanguage,
        })
      }
    }
  }

  return embeddings
}

/**
 * Measure memory usage
 */
function getMemoryUsage(): number {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage()
    return usage.heapUsed / 1024 / 1024 // Convert to MB
  }

  // Fallback for browser environments
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    return memory.usedJSHeapSize / 1024 / 1024
  }

  return 0
}

/**
 * Benchmark indexing performance with and without binary quantization
 */
async function benchmarkIndexing(
  embeddings: Array<{
    id: string
    content: string
    label: string
    embedding: number[]
    language: string
  }>,
  useBinaryQuantization: boolean,
): Promise<{
  indexingTimeMs: number
  indexSizeMB: number
  isEstimated: boolean
  memoryUsageMB: number
}> {
  const testSize = embeddings.length
  const startTime = Date.now()
  const startMemory = getMemoryUsage()

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const collectionName = useBinaryQuantization
    ? `benchmark_binary_${testSize}_${uniqueSuffix}`
    : `benchmark_standard_${testSize}_${uniqueSuffix}`

  // Initialize collection
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333"
  const qdrantApiKey = process.env.QDRANT_API_KEY
  const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    ...(qdrantApiKey && { apiKey: qdrantApiKey }),
  })

  try {
    // Create collection with or without binary quantization
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: BENCHMARK_CONFIG.vectorDimensions,
        distance: "Cosine",
      },
      ...(useBinaryQuantization && {
        quantization_config: {
          binary: {
            always_ram: true,
          },
        },
      }),
    })

    // Index embeddings
    console.log(
      `Indexing ${testSize} embeddings with${useBinaryQuantization ? "" : "out"} binary quantization...`,
    )

    const points = embeddings.map((embedding, index) => ({
      id: index,
      vector: embedding.embedding,
      payload: {
        content: embedding.content,
        label: embedding.label,
        content_type: "benchmark",
        language: embedding.language,
        content_id: embedding.id,
      },
    }))

    // Batch insert (Qdrant can handle up to 1000 points per request)
    const batchSize = 1000
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      await qdrantClient.upsert(collectionName, {
        points: batch,
      })
    }

    const endTime = Date.now()
    const endMemory = getMemoryUsage()

    // Get collection info to estimate size
    const collectionInfo = await qdrantClient.getCollection(collectionName)
    const indexSizeResult = estimateIndexSize(collectionInfo, testSize)

    return {
      indexingTimeMs: endTime - startTime,
      indexSizeMB: indexSizeResult.sizeMB,
      isEstimated: indexSizeResult.isEstimated,
      memoryUsageMB: endMemory - startMemory,
    }
  } catch (error) {
    console.error(`Indexing benchmark failed for size ${testSize}:`, error)
    throw error
  } finally {
    // Clean up - always run regardless of errors
    try {
      await qdrantClient.deleteCollection(collectionName)
    } catch (cleanupError) {
      console.warn(
        `Failed to clean up collection ${collectionName}:`,
        cleanupError,
      )
    }
  }
}

/**
 * Estimate collection size based on Qdrant metadata
 * Returns real size if available, otherwise returns estimated size with isEstimated flag
 */
function estimateIndexSize(
  collectionInfo: any,
  vectorCount: number,
): {
  sizeMB: number
  isEstimated: boolean
} {
  // Try to get real storage size from collection metadata
  // Qdrant may provide storage info in different fields depending on version
  const realStorageBytes =
    collectionInfo.storage_bytes ||
    collectionInfo.disk_usage_bytes ||
    collectionInfo.payload_storage_bytes ||
    collectionInfo.vectors_storage_bytes

  if (realStorageBytes && typeof realStorageBytes === "number") {
    return {
      sizeMB: realStorageBytes / 1024 / 1024, // Convert to MB
      isEstimated: false,
    }
  }

  // Fallback to estimation when real storage data is not available
  console.warn("Real storage size not available, using estimation")
  const vectorSizeBytes = BENCHMARK_CONFIG.vectorDimensions * 4 // 4 bytes per float
  const estimatedSize = vectorCount * vectorSizeBytes

  return {
    sizeMB: estimatedSize / 1024 / 1024, // Convert to MB
    isEstimated: true,
  }
}

/**
 * Benchmark search performance
 */
async function benchmarkSearch(
  embeddings: Array<{
    id: string
    content: string
    label: string
    embedding: number[]
    language: string
  }>,
  useBinaryQuantization: boolean,
): Promise<{
  searchTimeMs: number
  searchAccuracy: number
}> {
  const testSize = embeddings.length
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const collectionName = useBinaryQuantization
    ? `search_benchmark_binary_${testSize}_${uniqueSuffix}`
    : `search_benchmark_standard_${testSize}_${uniqueSuffix}`

  // Setup collection and data
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333"
  const qdrantApiKey = process.env.QDRANT_API_KEY
  const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    ...(qdrantApiKey && { apiKey: qdrantApiKey }),
  })

  try {
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: BENCHMARK_CONFIG.vectorDimensions,
        distance: "Cosine",
      },
      ...(useBinaryQuantization && {
        quantization_config: {
          binary: {
            always_ram: true,
          },
        },
      }),
    })

    // Index embeddings
    const points = embeddings.map((embedding, index) => ({
      id: index,
      vector: embedding.embedding,
      payload: {
        content: embedding.content,
        label: embedding.label,
        content_type: "benchmark",
        language: embedding.language,
        content_id: embedding.id,
      },
    }))

    const batchSize = 1000
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      await qdrantClient.upsert(collectionName, {
        points: batch,
      })
    }

    // Perform search benchmarks with multilingual user queries
    const SAMPLE_QUERIES: Record<string, { [lang: string]: string }> = {
      faq: {
        en: "What time is check-in?",
        es: "¿A qué hora es el check-in?",
        nl: "Hoe laat is het inchecken?",
        de: "Um wie viel Uhr ist der Check-in?",
        ru: "Во сколько регистрация?",
      },
      tour: {
        en: "wildlife tour near finca",
        es: "tour de naturaleza cerca de la finca",
        nl: "natuurtocht bij de finca",
        de: "Wildtier-Tour in der Nähe der Finca",
        ru: "тур дикой природы рядом с участком",
      },
      amenity: {
        en: "is there a pool?",
        es: "¿hay piscina?",
        nl: "is er een zwembad?",
        de: "gibt es einen Pool?",
        ru: "есть бассейн?",
      },
      pricing_rule: {
        en: "how much per night in high season",
        es: "cuánto cuesta por noche en temporada alta",
        nl: "hoeveel per nacht in het hoogseizoen",
        de: "wie viel pro Nacht in der Hauptsaison?",
        ru: "сколько за ночь в высокий сезон",
      },
      logistics: {
        en: "how to get there from San José",
        es: "cómo llegar desde San José",
        nl: "hoe kom je er vanaf San José",
        de: "wie kommt man von San José dorthin?",
        ru: "как добраться из Сан-Хосе",
      },
      review: {
        en: "what do guests say",
        es: "qué dicen los huéspedes",
        nl: "wat zeggen de gasten",
        de: "was sagen die Gäste",
        ru: "что говорят гости",
      },
      cancellation_policy: {
        en: "cancel my booking",
        es: "cancelar mi reservación",
        nl: "mijn boeking annuleren",
        de: "meine Buchung stornieren",
        ru: "отменить мое бронирование",
      },
      home: {
        en: "tell me about finca guarumo",
        es: "háblame de finca guarumo",
        nl: "vertel over finca guarumo",
        de: "erzähl mir von finca guarumo",
        ru: "расскажи о finca guarumo",
      },
      post: {
        en: "latest blog posts",
        es: "últimas publicaciones del blog",
        nl: "laatste blogberichten",
        de: "neueste Blog-Beiträge",
        ru: "последние посты в блоге",
      },
      payment_method: {
        en: "can I pay with card",
        es: "puedo pagar con tarjeta",
        nl: "kan ik met kaart betalen",
        de: "kann ich mit Karte bezahlen",
        ru: "можно ли оплатить картой",
      },
    }

    // Generate multilingual search queries
    const searchQueries: Array<{
      id: string
      content: string
      label: string
      embedding: number[]
      language: string
    }> = []

    for (const [contentType, queries] of Object.entries(SAMPLE_QUERIES)) {
      for (const language of languages) {
        const query = queries[language.value]
        if (query) {
          searchQueries.push({
            id: `${contentType}_${language.value}_query`,
            content: query,
            label: contentType,
            language: language.value,
            embedding: (await generateEmbedding(query, language.value))
              .embedding,
          })
        }
      }
    }

    const searchTimes: number[] = []
    let totalAccuracy = 0

    for (const query of searchQueries) {
      const searchStart = Date.now()

      const searchResult = await qdrantClient.search(collectionName, {
        vector: query.embedding,
        limit: BENCHMARK_CONFIG.searchK, // Reduced from 10 to 5
        score_threshold: BENCHMARK_CONFIG.searchThreshold,
      })

      const searchEnd = Date.now()
      searchTimes.push(searchEnd - searchStart)

      // Calculate accuracy (how many results match the expected content type)
      const accuracy = calculateSearchAccuracy(query, searchResult)
      totalAccuracy += accuracy
    }

    const averageSearchTime =
      searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length
    const averageAccuracy = totalAccuracy / searchQueries.length

    return {
      searchTimeMs: averageSearchTime,
      searchAccuracy: averageAccuracy,
    }
  } catch (error) {
    console.error(`Search benchmark failed for size ${testSize}:`, error)
    throw error
  } finally {
    // Clean up - always run regardless of errors
    try {
      await qdrantClient.deleteCollection(collectionName)
    } catch (cleanupError) {
      console.warn(
        `Failed to clean up collection ${collectionName}:`,
        cleanupError,
      )
    }
  }
}

/**
 * Calculate search accuracy based on content similarity
 */
interface QueryEmbedding {
  id: string
  content: string
  label: string
  embedding: number[]
}

interface SearchResultPoint {
  id: string | number
  score?: number
  payload?:
    | Record<string, unknown>
    | {
        content?: string
        label?: string
        content_type?: string
        language?: string
        content_id?: string
        [key: string]: unknown
      }
    | null
}

function calculateSearchAccuracy(
  query: QueryEmbedding,
  results: SearchResultPoint[],
): number {
  if (results.length === 0) return 0

  // Count results with matching labels (recall@k calculation)
  const relevantResults = results.filter(result => {
    const resultLabel =
      result.payload &&
      typeof result.payload === "object" &&
      "label" in result.payload &&
      typeof result.payload.label === "string"
        ? result.payload.label
        : ""

    return resultLabel === query.label
  })

  // Calculate recall@k: relevant results / min(k, total possible relevant)
  const k = results.length
  const recallAtK = relevantResults.length / k

  return recallAtK
}

/**
 * Run comprehensive benchmarks/**
 * Benchmark batch processing performance
 */
async function benchmarkBatchProcessing(testSize: number): Promise<{
  batchThroughputQueriesPerSecond: number
  avgBatchProcessingTime: number
  batchEfficiencyRatio: number
  tokenEfficiencyRatio: number
  costSavingsRatio: number
  avgBatchTokens: number
  avgIndividualTokens: number
}> {
  try {
    // Import batch processing functions
    const { buildBatchSemanticRAGContext, buildSemanticRAGContext } =
      await import("./semantic-context-builder")

    // Create test batch queries with proper locale handling
    const baseBatchQueries = [
      { text: "How much does it cost per night?", locale: "en" },
      { text: "¿Cuánto cuesta por noche?", locale: "es" },
      { text: "Is there a swimming pool at the villa?", locale: "en" },
      { text: "¿Hay piscina en la villa?", locale: "es" },
      { text: "What tours are available in the area?", locale: "en" },
      { text: "¿Qué tours hay en la zona?", locale: "es" },
      { text: "What is the cancellation policy?", locale: "en" },
      { text: "¿Cuál es la política de cancelación?", locale: "es" },
      { text: "Can I pay with credit card?", locale: "en" },
      { text: "¿Puedo pagar con tarjeta de crédito?", locale: "es" },
    ]

    const batchQueries = baseBatchQueries.slice(
      0,
      Math.min(BENCHMARK_CONFIG.batchChunkSize, 10),
    )

    // Extract query texts for batch processing (batch function expects strings)
    const batchQueryTexts = batchQueries.map(q => q.text)

    // Use primary locale (en) for batch processing since it processes multiple queries
    const batchPageContext = { page: "home", slug: undefined, locale: "en" }

    // Measure batch processing time
    const batchStartTime = Date.now()

    const batchResults = await buildBatchSemanticRAGContext(
      batchQueryTexts,
      batchPageContext,
      {
        locale: "en",
        useMultiStep: false,
        includeMetadata: false,
        useBatchProcessing: true,
        modelRole: "primary",
      },
    )

    const batchEndTime = Date.now()
    const batchProcessingTime = batchEndTime - batchStartTime

    // Calculate batch token usage from results (use mixed locales for realistic measurement)
    const batchTokens = batchResults.reduce((total, result, index) => {
      const queryLocale = batchQueries[index]?.locale || "en"
      return total + estimateTokenCount(result.formattedContext, queryLocale)
    }, 0)
    const avgBatchTokens = batchTokens / batchResults.length

    // Calculate throughput
    const batchThroughputQueriesPerSecond =
      (batchQueries.length / batchProcessingTime) * 1000

    // Measure individual processing time for comparison with proper locale handling
    const individualStartTime = Date.now()
    let individualResults = []
    let individualTokens = 0

    for (const query of batchQueries) {
      // Create proper pageContext for each query locale
      const queryPageContext = {
        page: "home",
        slug: undefined,
        locale: query.locale,
      }

      const result = await buildSemanticRAGContext(
        query.text,
        queryPageContext,
        {
          locale: query.locale,
          useMultiStep: false,
          includeMetadata: false,
          useBatchProcessing: false,
          modelRole: "primary",
        },
      )
      individualResults.push(result)
      individualTokens += estimateTokenCount(
        result.formattedContext,
        query.locale,
      )
    }

    const individualEndTime = Date.now()
    const individualProcessingTime = individualEndTime - individualStartTime
    const avgIndividualTime = individualProcessingTime / batchQueries.length
    const avgIndividualTokens = individualTokens / individualResults.length

    // Calculate efficiency ratios
    const batchEfficiencyRatio =
      avgIndividualTime > 0
        ? avgIndividualTime / (batchProcessingTime / batchQueries.length)
        : 1

    const tokenEfficiencyRatio =
      avgIndividualTokens > 0 ? avgIndividualTokens / avgBatchTokens : 1

    // Cost analysis for batch vs individual
    const batchCostAnalysis = calculateActualCost(avgBatchTokens)
    const individualCostAnalysis = calculateActualCost(avgIndividualTokens)
    const costSavingsRatio =
      individualCostAnalysis.cost > 0
        ? (individualCostAnalysis.cost - batchCostAnalysis.cost) /
          individualCostAnalysis.cost
        : 0

    console.log(
      `Batch processing: ${batchQueries.length} queries in ${batchProcessingTime}ms`,
    )
    console.log(
      `Throughput: ${batchThroughputQueriesPerSecond.toFixed(2)} queries/second`,
    )
    console.log(
      `Time efficiency: ${batchEfficiencyRatio.toFixed(2)}x (higher is better)`,
    )
    console.log(
      `Token efficiency: ${tokenEfficiencyRatio.toFixed(2)}x (batch: ${avgBatchTokens.toFixed(0)} vs individual: ${avgIndividualTokens.toFixed(0)})`,
    )
    console.log(
      `Cost savings: ${(costSavingsRatio * 100).toFixed(1)}% ($${individualCostAnalysis.cost.toFixed(6)} -> $${batchCostAnalysis.cost.toFixed(6)})`,
    )

    return {
      batchThroughputQueriesPerSecond,
      avgBatchProcessingTime: batchProcessingTime / batchQueries.length,
      batchEfficiencyRatio,
      tokenEfficiencyRatio,
      costSavingsRatio,
      avgBatchTokens,
      avgIndividualTokens,
    }
  } catch (error) {
    console.error("Failed to benchmark batch processing:", error)
    return {
      batchThroughputQueriesPerSecond: 0,
      avgBatchProcessingTime: 0,
      batchEfficiencyRatio: 1,
      tokenEfficiencyRatio: 1,
      costSavingsRatio: 0,
      avgBatchTokens: 0,
      avgIndividualTokens: 0,
    }
  }
}

/**
 * Run binary quantization benchmarks
 */
export async function runBinaryQuantizationBenchmarks(): Promise<BenchmarkSummary> {
  console.log("Starting binary quantization benchmarks...")

  const results: BenchmarkResult[] = []

  for (const testSize of BENCHMARK_CONFIG.testSizes) {
    console.log(`\nBenchmarking test size: ${testSize}`)

    // Generate embeddings once for this test size
    console.log(`Generating ${testSize} test embeddings...`)
    const embeddings = await generateTestEmbeddings(testSize)

    // Test without binary quantization
    const standardIndexing = await benchmarkIndexing(embeddings, false)
    const standardSearch = await benchmarkSearch(embeddings, false)

    // Test with binary quantization
    const binaryIndexing = await benchmarkIndexing(embeddings, true)
    const binarySearch = await benchmarkSearch(embeddings, true)

    // Calculate metrics
    const compressionRatio =
      1 - binaryIndexing.indexSizeMB / standardIndexing.indexSizeMB
    const searchQualityLoss =
      (standardSearch.searchAccuracy - binarySearch.searchAccuracy) /
      standardSearch.searchAccuracy

    // Calculate actual token metrics by measuring buildSemanticRAGContext calls
    const tokenMetrics = await measureActualTokenUsage(testSize)

    // Calculate cost once and reuse for both result entries
    const costAnalysis = calculateActualCost(tokenMetrics.avgTokensPerQuery)

    // Log cost optimization recommendations if over budget
    const anyBudgetExceeded =
      tokenMetrics.costAnalysis.primaryOverBudget ||
      tokenMetrics.costAnalysis.toolsOverBudget
    if (anyBudgetExceeded) {
      console.warn(`⚠️  COST OPTIMIZATION NEEDED:`)
      if (tokenMetrics.costAnalysis.primaryOverBudget) {
        console.warn(
          `  LLM Context: Exceeds primary budget by ${tokenMetrics.costAnalysis.primaryBudgetExceededBy.toFixed(1)}%`,
        )
      }
      if (tokenMetrics.costAnalysis.toolsOverBudget) {
        console.warn(
          `  Embeddings: Exceeds tools budget by ${tokenMetrics.costAnalysis.toolsBudgetExceededBy.toFixed(1)}%`,
        )
      }
      tokenMetrics.costAnalysis.costOptimizations.forEach(rec => {
        console.warn(`  • ${rec}`)
      })
    }

    // Benchmark batch processing performance
    const batchMetrics = await benchmarkBatchProcessing(testSize)

    // Create result entries
    results.push({
      testSize,
      configuration: "standard",
      indexingTimeMs: standardIndexing.indexingTimeMs,
      indexSizeMB: standardIndexing.indexSizeMB,
      isEstimated: standardIndexing.isEstimated,
      searchTimeMs: standardSearch.searchTimeMs,
      searchAccuracy: standardSearch.searchAccuracy,
      compressionRatio: 0,
      memoryUsageMB: standardIndexing.memoryUsageMB,
      throughputVectorsPerSecond:
        testSize / (standardIndexing.indexingTimeMs / 1000),
      avgTokensPerQuery: tokenMetrics.avgTokensPerQuery,
      avgCostPerQuery: costAnalysis.cost, // Reuse calculated cost
      batchProcessingTime: batchMetrics.avgBatchProcessingTime,
      contextReductionRatio: tokenMetrics.contextReductionRatio, // Real measurement
    })

    results.push({
      testSize,
      configuration: "binary",
      indexingTimeMs: binaryIndexing.indexingTimeMs,
      indexSizeMB: binaryIndexing.indexSizeMB,
      isEstimated: binaryIndexing.isEstimated,
      searchTimeMs: binarySearch.searchTimeMs,
      searchAccuracy: binarySearch.searchAccuracy,
      compressionRatio,
      memoryUsageMB: binaryIndexing.memoryUsageMB,
      throughputVectorsPerSecond:
        testSize / (binaryIndexing.indexingTimeMs / 1000),
      avgTokensPerQuery: tokenMetrics.avgTokensPerQuery,
      avgCostPerQuery: costAnalysis.cost, // Reuse calculated cost
      batchProcessingTime: batchMetrics.avgBatchProcessingTime,
      contextReductionRatio: tokenMetrics.contextReductionRatio, // Real measurement
    })

    console.log(
      `Standard indexing: ${standardIndexing.indexingTimeMs}ms, ${standardIndexing.indexSizeMB}MB`,
    )
    console.log(
      `Binary indexing: ${binaryIndexing.indexingTimeMs}ms, ${binaryIndexing.indexSizeMB}MB`,
    )
    console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`)
    console.log(`Search quality loss: ${(searchQualityLoss * 100).toFixed(1)}%`)
  }

  // Calculate summary statistics
  const binaryResults = results.filter(r => r.configuration === "binary")
  const standardResults = results.filter(r => r.configuration === "standard")

  const summary: BenchmarkSummary = {
    results,
    averageIndexingTime:
      binaryResults.reduce((sum, r) => sum + r.indexingTimeMs, 0) /
      binaryResults.length,
    averageSearchTime:
      binaryResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
      binaryResults.length,
    averageCompressionRatio:
      binaryResults.reduce((sum, r) => sum + r.compressionRatio, 0) /
      binaryResults.length,
    averageSearchAccuracy:
      binaryResults.reduce((sum, r) => sum + r.searchAccuracy, 0) /
      binaryResults.length,
    averageTokensPerQuery:
      binaryResults.reduce((sum, r) => sum + r.avgTokensPerQuery, 0) /
      binaryResults.length,
    averageCostPerQuery:
      binaryResults.reduce((sum, r) => sum + (r.avgCostPerQuery || 0), 0) /
      binaryResults.length,
    recommendations: generateRecommendations(results),
    costOptimizations: [], // Removed - use per-query recommendations from calculateActualCost instead
  }

  console.log("\n=== BENCHMARK SUMMARY ===")
  console.log(
    `Average indexing time: ${summary.averageIndexingTime.toFixed(0)}ms`,
  )
  console.log(`Average search time: ${summary.averageSearchTime.toFixed(0)}ms`)
  console.log(
    `Average compression ratio: ${(summary.averageCompressionRatio * 100).toFixed(1)}%`,
  )
  console.log(
    `Average search accuracy: ${(summary.averageSearchAccuracy * 100).toFixed(1)}%`,
  )

  return summary
}

/**
 * Generate recommendations based on benchmark results
 */
function generateRecommendations(results: BenchmarkResult[]): string[] {
  const recommendations: string[] = []

  const binaryResults = results.filter(r => r.configuration === "binary")
  const standardResults = results.filter(r => r.configuration === "standard")

  // Analyze compression effectiveness
  const avgCompression =
    binaryResults.reduce((sum, r) => sum + r.compressionRatio, 0) /
    binaryResults.length

  // Check if any binary results use estimated sizes
  const hasEstimatedSizes = binaryResults.some(r => r.isEstimated)

  if (hasEstimatedSizes) {
    recommendations.push(
      `Compression ratio (${(avgCompression * 100).toFixed(1)}%) is based on estimated storage sizes - threshold recommendations skipped`,
    )
  } else {
    if (avgCompression < BENCHMARK_CONFIG.minCompressionRatio) {
      recommendations.push(
        `Binary quantization compression ratio (${(avgCompression * 100).toFixed(1)}%) is below threshold (${(BENCHMARK_CONFIG.minCompressionRatio * 100).toFixed(1)}%)`,
      )
    } else {
      recommendations.push(
        `Binary quantization provides good compression (${(avgCompression * 100).toFixed(1)}%)`,
      )
    }
  }

  // Analyze search performance
  const avgBinarySearchTime =
    binaryResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
    binaryResults.length
  const avgStandardSearchTime =
    standardResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
    standardResults.length

  if (avgBinarySearchTime < avgStandardSearchTime) {
    recommendations.push(
      `Binary quantization improves search speed by ${(((avgStandardSearchTime - avgBinarySearchTime) / avgStandardSearchTime) * 100).toFixed(1)}%`,
    )
  } else {
    recommendations.push(
      `Binary quantization does not improve search speed (consider investigating configuration)`,
    )
  }

  // Analyze search quality
  const avgBinaryAccuracy =
    binaryResults.reduce((sum, r) => sum + r.searchAccuracy, 0) /
    binaryResults.length
  const avgStandardAccuracy =
    standardResults.reduce((sum, r) => sum + r.searchAccuracy, 0) /
    standardResults.length
  const qualityLoss =
    (avgStandardAccuracy - avgBinaryAccuracy) / avgStandardAccuracy

  if (qualityLoss > BENCHMARK_CONFIG.maxSearchQualityLoss) {
    recommendations.push(
      `Search quality loss (${(qualityLoss * 100).toFixed(1)}%) exceeds threshold (${(BENCHMARK_CONFIG.maxSearchQualityLoss * 100).toFixed(1)}%)`,
    )
  } else {
    recommendations.push(
      `Search quality loss is acceptable (${(qualityLoss * 100).toFixed(1)}%)`,
    )
  }

  // Memory usage analysis
  const avgBinaryMemory =
    binaryResults.reduce((sum, r) => sum + r.memoryUsageMB, 0) /
    binaryResults.length
  if (avgBinaryMemory > BENCHMARK_CONFIG.maxMemoryUsage) {
    recommendations.push(
      `Memory usage (${avgBinaryMemory.toFixed(1)}MB) exceeds threshold (${BENCHMARK_CONFIG.maxMemoryUsage}MB)`,
    )
  }

  return recommendations
}

/**
 * Export benchmark results to JSON for analysis
 */
export function exportBenchmarkResults(summary: BenchmarkSummary): string {
  return JSON.stringify(summary, null, 2)
}

/**
 * Compare benchmark results with previous runs
 */
export function compareBenchmarkResults(
  current: BenchmarkSummary,
  previous: BenchmarkSummary,
): {
  improvements: string[]
  regressions: string[]
  summary: string
} {
  const improvements: string[] = []
  const regressions: string[] = []

  // Compare indexing time
  const indexingImprovement =
    (previous.averageIndexingTime - current.averageIndexingTime) /
    previous.averageIndexingTime
  if (Math.abs(indexingImprovement) > 0.05) {
    // 5% threshold
    if (indexingImprovement > 0) {
      improvements.push(
        `Indexing time improved by ${(indexingImprovement * 100).toFixed(1)}%`,
      )
    } else {
      regressions.push(
        `Indexing time degraded by ${(-indexingImprovement * 100).toFixed(1)}%`,
      )
    }
  }

  // Compare search time
  const searchImprovement =
    (previous.averageSearchTime - current.averageSearchTime) /
    previous.averageSearchTime
  if (Math.abs(searchImprovement) > 0.05) {
    if (searchImprovement > 0) {
      improvements.push(
        `Search time improved by ${(searchImprovement * 100).toFixed(1)}%`,
      )
    } else {
      regressions.push(
        `Search time degraded by ${(-searchImprovement * 100).toFixed(1)}%`,
      )
    }
  }

  // Compare compression ratio
  const compressionChange =
    current.averageCompressionRatio - previous.averageCompressionRatio
  if (Math.abs(compressionChange) > 0.05) {
    if (compressionChange > 0) {
      improvements.push(
        `Compression ratio improved by ${(compressionChange * 100).toFixed(1)}%`,
      )
    } else {
      regressions.push(
        `Compression ratio degraded by ${(-compressionChange * 100).toFixed(1)}%`,
      )
    }
  }

  const summary = `Found ${improvements.length} improvements and ${regressions.length} regressions compared to previous benchmark.`

  return { improvements, regressions, summary }
}
