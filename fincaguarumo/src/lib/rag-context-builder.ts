import {
  extractAllFAQs,
  extractPageContent,
  extractAllTours,
  extractHomeContent,
  extractAllReviews,
  extractTopReviews,
  extractAllPosts,
  extractAllPages,
  searchFAQs,
  searchPosts,
  searchTours,
  getAverageRating,
  extractAllAmenities,
  extractFeaturedAmenities,
  extractAllPricingRules,
  extractAllPaymentMethods,
  extractAllCancellationPolicies,
  extractDefaultCancellationPolicy,
  extractAllLogistics,
  extractImportantLogistics,
  searchAmenities,
  searchLogistics,
} from "./sanity-data-extractor"
import { portableTextToPlain } from "@/sanity/lib/portableTextHelper"
import {
  buildSemanticRAGContext,
  validateSemanticRAGSetup,
} from "./semantic-rag/semantic-context-builder"
import { detectUserIntent, enhanceQuery } from "./intent-detection"

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

// Build context based on user query and page context
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
          useMultiStep: true,
          includeMetadata: true,
        },
      )

      return semanticContext.formattedContext
    } else {
      console.warn(
        "Semantic RAG not available, falling back to keyword-based RAG",
      )
      console.warn("Issues:", validation.errors)

      // Fallback to original keyword-based approach
      return await buildKeywordBasedRAGContext(userQuery, pageContext)
    }
  } catch (error) {
    console.error(
      "Error in buildRAGContext, falling back to keyword-based:",
      error,
    )
    return await buildKeywordBasedRAGContext(userQuery, pageContext)
  }
}

// Fallback keyword-based RAG context builder
async function buildKeywordBasedRAGContext(
  userQuery: string,
  pageContext: { page: string; slug?: string; locale: string },
): Promise<string> {
  const context: RAGContext = {}
  let contextText = ""

  const userIntent = detectUserIntent(userQuery)
  const enhancedTerms = enhanceQuery(userQuery)

  // Extract relevant FAQs with enhanced matching
  const faqs = await extractAllFAQs()
  const relevantFAQs = faqs.filter(
    (faq: any) =>
      faq.language === pageContext.locale &&
      (faq.intent === userIntent || faq.priority >= 5) &&
      enhancedTerms.some(
        term =>
          faq.question.toLowerCase().includes(term) ||
          faq.answer.toLowerCase().includes(term) ||
          faq.keywords?.some((k: string) => k.toLowerCase().includes(term)),
      ),
  )

  // Sort by priority and relevance
  relevantFAQs.sort((a: any, b: any) => {
    if (a.intent === userIntent && b.intent !== userIntent) return -1
    if (b.intent === userIntent && a.intent !== userIntent) return 1
    return (b.priority || 1) - (a.priority || 1)
  })

  if (relevantFAQs.length > 0) {
    context.faqs = relevantFAQs.slice(0, 8) // Increased limit
    contextText += "\n\n=== RELEVANT FAQs ===\n"
    context.faqs?.forEach((faq: any, i: number) => {
      contextText += `\nQ${i + 1}: ${faq.question}\nA: ${faq.answer}\n`
      if (faq.relatedQuestions && faq.relatedQuestions.length > 0) {
        contextText += `Related: ${faq.relatedQuestions.map((rq: any) => rq.question).join(", ")}\n`
      }
    })
  }

  // Enhanced amenities context
  if (
    userIntent === "amenities" ||
    enhancedTerms.some(term =>
      ["amenit", "facilit", "feature", "pool", "wifi", "kitchen"].some(
        keyword => term.includes(keyword),
      ),
    )
  ) {
    const amenities = await extractAllAmenities()
    const relevantAmenities = amenities.filter(
      (amenity: any) =>
        amenity.language === pageContext.locale &&
        enhancedTerms.some(
          term =>
            amenity.title.toLowerCase().includes(term) ||
            amenity.description.toLowerCase().includes(term) ||
            amenity.keywords?.some((k: string) =>
              k.toLowerCase().includes(term),
            ) ||
            amenity.category.toLowerCase().includes(term),
        ),
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
  }

  // Enhanced pricing context
  if (
    userIntent === "pricing" ||
    enhancedTerms.some(term =>
      ["price", "cost", "fee", "discount", "season", "rate"].some(keyword =>
        term.includes(keyword),
      ),
    )
  ) {
    const pricingRules = await extractAllPricingRules()
    const relevantPricing = pricingRules.filter(
      (rule: any) =>
        rule.language === pageContext.locale &&
        enhancedTerms.some(
          term =>
            rule.title.toLowerCase().includes(term) ||
            rule.description.toLowerCase().includes(term) ||
            rule.ruleType.toLowerCase().includes(term) ||
            rule.season?.toLowerCase().includes(term),
        ),
    )

    if (relevantPricing.length > 0) {
      context.pricingRules = relevantPricing
      contextText += "\n\n=== PRICING INFORMATION ===\n"
      context.pricingRules?.forEach((rule: any, i: number) => {
        contextText += `\n${i + 1}. ${rule.title}\n`
        contextText += `   Type: ${rule.ruleType}\n`
        if (rule.season) contextText += `   Season: ${rule.season}\n`
        if (rule.basePrice) contextText += `   Base Price: $${rule.basePrice}\n`
        if (rule.percentage) contextText += `   ${rule.percentage}%\n`
        if (rule.fixedAmount) contextText += `   Fee: $${rule.fixedAmount}\n`
        if (rule.minimumNights)
          contextText += `   Minimum nights: ${rule.minimumNights}\n`
        contextText += `   ${rule.description}\n`
      })
    }
  }

  // Enhanced payment methods context
  if (
    userIntent === "payment" ||
    enhancedTerms.some(term =>
      ["payment", "pay", "card", "stripe", "paypal"].some(keyword =>
        term.includes(keyword),
      ),
    )
  ) {
    const paymentMethods = await extractAllPaymentMethods()
    const relevantPayments = paymentMethods.filter(
      (method: any) =>
        method.language === pageContext.locale &&
        enhancedTerms.some(
          term =>
            method.title.toLowerCase().includes(term) ||
            method.description.toLowerCase().includes(term) ||
            method.methodType.toLowerCase().includes(term) ||
            method.processor?.toLowerCase().includes(term),
        ),
    )

    if (relevantPayments.length > 0) {
      context.paymentMethods = relevantPayments
      contextText += "\n\n=== PAYMENT METHODS ===\n"
      context.paymentMethods?.forEach((method: any, i: number) => {
        contextText += `\n${i + 1}. ${method.title}\n`
        contextText += `   Type: ${method.methodType}\n`
        if (method.processor)
          contextText += `   Processor: ${method.processor}\n`
        if (method.processingTime)
          contextText += `   Processing time: ${method.processingTime}\n`
        if (method.fees) contextText += `   Fees: ${method.fees}\n`
        if (method.isRecommended) contextText += "   ⭐ Recommended\n"
        contextText += `   ${method.description}\n`
      })
    }
  }

  // Enhanced cancellation policy context
  if (
    userIntent === "cancellation" ||
    enhancedTerms.some(term =>
      ["cancel", "refund", "modification", "change"].some(keyword =>
        term.includes(keyword),
      ),
    )
  ) {
    const cancellationPolicy = await extractDefaultCancellationPolicy()
    if (
      cancellationPolicy &&
      cancellationPolicy.language === pageContext.locale
    ) {
      context.cancellationPolicy = cancellationPolicy
      contextText += "\n\n=== CANCELLATION POLICY ===\n"
      contextText += `Policy: ${cancellationPolicy.title}\n`
      contextText += `Type: ${cancellationPolicy.policyType}\n`
      contextText += `${cancellationPolicy.description}\n`

      if (
        cancellationPolicy.timeframes &&
        cancellationPolicy.timeframes.length > 0
      ) {
        contextText += "\nCancellation Timeframes:\n"
        cancellationPolicy.timeframes.forEach((timeframe: any) => {
          contextText += `- ${timeframe.daysBeforeCheckIn}+ days before check-in: ${timeframe.refundPercentage}% refund\n`
          contextText += `  ${timeframe.description}\n`
        })
      }

      if (cancellationPolicy.modificationsAllowed) {
        contextText += `\nModifications: ${cancellationPolicy.modificationPolicy || "Allowed"}\n`
      }

      contextText += `\nNo-show policy: ${cancellationPolicy.noShowPolicy}\n`
    }
  }

  // Enhanced logistics context
  if (
    userIntent === "logistics" ||
    enhancedTerms.some(term =>
      [
        "check",
        "arrival",
        "departure",
        "transport",
        "direction",
        "parking",
      ].some(keyword => term.includes(keyword)),
    )
  ) {
    const logistics = await extractImportantLogistics()
    const relevantLogistics = logistics.filter(
      (logistic: any) =>
        logistic.language === pageContext.locale &&
        enhancedTerms.some(
          term =>
            logistic.title.toLowerCase().includes(term) ||
            logistic.description.toLowerCase().includes(term) ||
            logistic.instructions?.toLowerCase().includes(term) ||
            logistic.category.toLowerCase().includes(term) ||
            logistic.keywords?.some((k: string) =>
              k.toLowerCase().includes(term),
            ),
        ),
    )

    if (relevantLogistics.length > 0) {
      context.logistics = relevantLogistics
      contextText += "\n\n=== LOGISTICS & PRACTICAL INFORMATION ===\n"
      context.logistics?.forEach((logistic: any, i: number) => {
        contextText += `\n${i + 1}. ${logistic.title} (${logistic.category})\n`
        contextText += `   ${logistic.description}\n`
        if (logistic.checkInTime)
          contextText += `   Check-in: ${logistic.checkInTime}\n`
        if (logistic.checkOutTime)
          contextText += `   Check-out: ${logistic.checkOutTime}\n`
        if (logistic.instructions)
          contextText += `   Instructions: ${logistic.instructions}\n`
        if (logistic.contactInfo)
          contextText += `   Contact: ${logistic.contactInfo}\n`
        if (logistic.isImportant) contextText += "   ⭐ Important\n"
      })
    }
  }

  // Extract page content if on a specific page
  if (pageContext.page === "stay" && pageContext.slug) {
    const pageInfo = await extractPageContent(pageContext.slug)
    if (pageInfo) {
      context.pageInfo = pageInfo
      contextText += "\n\n=== PROPERTY INFORMATION ===\n"
      contextText += `Title: ${pageInfo.title}\n`
      if (pageInfo.subtitle) {
        contextText += `Subtitle: ${pageInfo.subtitle}\n`
      }
      contextText += `Description: ${pageInfo.description}\n`
      if (pageInfo.price) {
        contextText += `Price: $${pageInfo.price} per person\n`
      } else if (pageInfo.pricingRules && pageInfo.pricingRules.length > 0) {
        const baseRate = pageInfo.pricingRules.find(
          (rule: any) => rule.ruleType === "base_rate",
        )
        if (baseRate && baseRate.basePrice) {
          contextText += `Base Price: $${baseRate.basePrice} per person\n`
        }
        // Add discount information
        const discounts = pageInfo.pricingRules.filter(
          (rule: any) => rule.ruleType === "discount",
        )
        if (discounts.length > 0) {
          contextText += `Available discounts: ${discounts.map((d: any) => `${d.title} (${d.percentage}% off for ${d.minimumNights}+ nights)`).join(", ")}\n`
        }
      }
      if (pageInfo.body) {
        const plainText = portableTextToPlain(pageInfo.body)
        contextText += `Details: ${plainText.substring(0, 800)}...\n`
      }
      if (pageInfo.categories && pageInfo.categories.length > 0) {
        contextText += `Categories: ${pageInfo.categories.map((c: any) => c.title).join(", ")}\n`
      }
    }
  }

  // Extract tour information if query mentions tours/activities
  if (
    userIntent === "tours" ||
    enhancedTerms.some(term =>
      ["tour", "activity", "attraction", "excursion", "trip"].some(keyword =>
        term.includes(keyword),
      ),
    )
  ) {
    const tours = await extractAllTours()
    const relevantTours = tours.filter(
      (t: any) => t.language === pageContext.locale,
    )
    if (relevantTours.length > 0) {
      context.tours = relevantTours.slice(0, 8)
      contextText += "\n\n=== AVAILABLE TOURS & ACTIVITIES ===\n"
      context.tours?.forEach((tour: any, i: number) => {
        contextText += `\n${i + 1}. ${tour.title}`
        if (tour.isFeatured) contextText += " ⭐ Featured"
        if (tour.isNew) contextText += " 🆕 New"
        contextText += `\n   Location: ${tour.location}\n`
        contextText += `   Duration: ${tour.duration}\n`
        contextText += `   Price: $${tour.price}\n`
        contextText += `   Description: ${tour.description}\n`
      })
    }
  }

  // Extract reviews if query mentions reviews/ratings
  if (
    userIntent === "reviews" ||
    enhancedTerms.some(term =>
      ["review", "rating", "feedback", "guest", "experience"].some(keyword =>
        term.includes(keyword),
      ),
    )
  ) {
    const topReviews = await extractTopReviews(5)
    const avgRating = await getAverageRating()

    if (topReviews.length > 0) {
      context.reviews = topReviews
      context.averageRating = avgRating
      contextText += "\n\n=== GUEST REVIEWS ===\n"
      contextText += `Average Rating: ${avgRating.average}/10 (${avgRating.total} reviews)\n`
      contextText += `Airbnb: ${avgRating.airbnb} reviews | Booking.com: ${avgRating.booking} reviews\n\n`
      context.reviews?.forEach((review: any, i: number) => {
        contextText += `${i + 1}. ${review.author?.name || "Anonymous"} (${review.platform})\n`
        contextText += `   Rating: ${review.rating}/10\n`
        contextText += `   Date: ${review.date}\n`
        contextText += `   "${review.reviewText}"\n\n`
      })
    }
  }

  // Extract blog posts if query mentions blog/articles/local attractions
  if (
    enhancedTerms.some(term =>
      ["blog", "article", "post", "local", "area", "nearby", "around"].some(
        keyword => term.includes(keyword),
      ),
    )
  ) {
    const posts = await extractAllPosts()
    const relevantPosts = posts.filter(
      (p: any) => p.language === pageContext.locale,
    )
    if (relevantPosts.length > 0) {
      context.posts = relevantPosts.slice(0, 5)
      contextText += "\n\n=== BLOG POSTS & LOCAL ATTRACTIONS ===\n"
      context.posts?.forEach((post: any, i: number) => {
        contextText += `\n${i + 1}. ${post.title}\n`
        if (post.author) {
          contextText += `   By: ${post.author.name}\n`
        }
        if (post.publishedAt) {
          contextText += `   Published: ${new Date(post.publishedAt).toLocaleDateString()}\n`
        }
        if (post.categories && post.categories.length > 0) {
          contextText += `   Categories: ${post.categories.map((c: any) => c.title).join(", ")}\n`
        }
        if (post.body) {
          const plainText = portableTextToPlain(post.body)
          contextText += `   Preview: ${plainText.substring(0, 200)}...\n`
        }
      })
    }
  }

  // Extract home page content for general property info
  if (pageContext.page === "homepage") {
    const homeInfo = await extractHomeContent()
    if (homeInfo) {
      context.homeInfo = homeInfo
      contextText += "\n\n=== VILLA BRUNO OVERVIEW ===\n"
      contextText += `Title: ${homeInfo.hero_title}\n`
      if (homeInfo.hero_slogan) {
        contextText += `Slogan: ${homeInfo.hero_slogan}\n`
      }
      if (homeInfo.subtitle) {
        contextText += `Subtitle: ${homeInfo.subtitle}\n`
      }
      if (homeInfo.intro_body) {
        const plainText = portableTextToPlain(homeInfo.intro_body)
        contextText += `About: ${plainText.substring(0, 600)}...\n`
      }
    }
  }

  // If no specific context was found, provide general information
  if (contextText === "") {
    contextText += "\n\n=== GENERAL INFORMATION ===\n"
    contextText +=
      "Villa Bruno is a beautiful vacation rental property in Costa Rica.\n"
    contextText +=
      "For specific information about availability, bookings, tours, or local attractions, please ask a more specific question.\n"
  }

  return contextText
}

// Search across all content types
export async function searchAllContent(
  searchTerm: string,
  locale: string = "en",
): Promise<{
  faqs: any[]
  posts: any[]
  tours: any[]
}> {
  const [faqs, posts, tours] = await Promise.all([
    searchFAQs(searchTerm, locale),
    searchPosts(searchTerm, locale),
    searchTours(searchTerm, locale),
  ])

  return { faqs, posts, tours }
}

// Get comprehensive property information
export async function getPropertyOverview(
  locale: string = "en",
): Promise<string> {
  const [homeInfo, pages, avgRating] = await Promise.all([
    extractHomeContent(),
    extractAllPages(),
    getAverageRating(),
  ])

  let overview = "\n\n=== VILLA BRUNO PROPERTY OVERVIEW ===\n"

  if (homeInfo) {
    overview += `\n${homeInfo.hero_title}\n`
    if (homeInfo.hero_slogan) {
      overview += `"${homeInfo.hero_slogan}"\n`
    }
    if (homeInfo.intro_body) {
      const plainText = portableTextToPlain(homeInfo.intro_body)
      overview += `\n${plainText.substring(0, 500)}...\n`
    }
  }

  if (pages && pages.length > 0) {
    overview += "\n\n=== AVAILABLE PROPERTIES ===\n"
    pages.forEach((page: any) => {
      if (page.language === locale) {
        overview += `\n• ${page.title}\n`
        if (page.description) {
          overview += `  ${page.description.substring(0, 150)}...\n`
        }
        if (page.price) {
          overview += `  Price: $${page.price} per person\n`
        }
      }
    })
  }

  overview += `\n\n=== GUEST RATINGS ===\n`
  overview += `Average Rating: ${avgRating.average}/10 (${avgRating.total} total reviews)\n`
  overview += `Airbnb: ${avgRating.airbnb} reviews | Booking.com: ${avgRating.booking} reviews\n`

  return overview
}
