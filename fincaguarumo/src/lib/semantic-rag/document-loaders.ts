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
} from "../sanity-data-extractor"
import { portableTextToPlain } from "@/sanity/lib/portableTextHelper"
import { generateBatchEmbeddings } from "./embeddings-hybrid"

export interface ProcessedDocument {
  contentId: string
  contentType: string
  language: string
  content: string
  metadata: Record<string, any>
}

/**
 * Process FAQ documents for embedding
 */
export async function processFAQDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const faqs = await extractAllFAQs()
    const languageFAQs = faqs.filter((faq: any) => faq.language === language)

    return languageFAQs.map((faq: any) => ({
      contentId: faq._id,
      contentType: "faq",
      language: faq.language,
      content: `Q: ${faq.question}\nA: ${faq.answer}`,
      metadata: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        priority: faq.priority || 1,
        keywords: faq.keywords || [],
        intent: faq.intent || "general",
        relatedQuestions:
          faq.relatedQuestions?.map((rq: any) => rq.question) || [],
      },
    }))
  } catch (error) {
    console.error("Error processing FAQ documents:", error)
    throw new Error(
      `FAQ processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process page/villa documents for embedding
 */
export async function processPageDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const pages = await extractAllPages()
    const languagePages = pages.filter(
      (page: any) => page.language === language,
    )

    const processedPages: ProcessedDocument[] = []

    for (const page of languagePages) {
      let content = `Title: ${page.title}\n`

      if (page.subtitle) {
        content += `Subtitle: ${page.subtitle}\n`
      }

      if (page.description) {
        content += `Description: ${page.description}\n`
      }

      if (page.price) {
        content += `Price: $${page.price} per person\n`
      } else if (page.pricingRules && page.pricingRules.length > 0) {
        const baseRate = page.pricingRules.find(
          (rule: any) => rule.ruleType === "base_rate",
        )
        if (baseRate && baseRate.basePrice) {
          content += `Base Price: $${baseRate.basePrice} per person\n`
        }
      }

      if (page.body) {
        const plainText = portableTextToPlain(page.body)
        content += `Details: ${plainText}\n`
      }

      if (page.categories && page.categories.length > 0) {
        content += `Categories: ${page.categories.map((c: any) => c.title).join(", ")}\n`
      }

      processedPages.push({
        contentId: page.slug,
        contentType: "page",
        language: page.language,
        content,
        metadata: {
          title: page.title,
          subtitle: page.subtitle,
          description: page.description,
          price: page.price,
          pricingRules: page.pricingRules,
          categories: page.categories?.map((c: any) => c.title) || [],
          slug: page.slug,
        },
      })
    }

    return processedPages
  } catch (error) {
    console.error("Error processing page documents:", error)
    throw new Error(
      `Page processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process tour documents for embedding
 */
export async function processTourDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const tours = await extractAllTours()
    const languageTours = tours.filter(
      (tour: any) => tour.language === language,
    )

    return languageTours.map((tour: any) => ({
      contentId: tour._id,
      contentType: "tour",
      language: tour.language,
      content: `Title: ${tour.title}\nDescription: ${tour.description}\nLocation: ${tour.location}\nDuration: ${tour.duration}\nPrice: $${tour.price}`,
      metadata: {
        title: tour.title,
        description: tour.description,
        location: tour.location,
        duration: tour.duration,
        price: tour.price,
        isFeatured: tour.isFeatured || false,
        isNew: tour.isNew || false,
      },
    }))
  } catch (error) {
    console.error("Error processing tour documents:", error)
    throw new Error(
      `Tour processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process review documents for embedding
 */
export async function processReviewDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const reviews = await extractAllReviews()
    // Reviews don't typically have language, so we'll include all
    // but filter by rating to include only meaningful reviews

    const meaningfulReviews = reviews.filter(
      (review: any) =>
        review.rating >= 6 && // Only include reviews with rating 6+
        review.reviewText &&
        review.reviewText.length > 20, // Only include substantial reviews
    )

    return meaningfulReviews.map((review: any) => ({
      contentId: review._id,
      contentType: "review",
      language: language, // Assign default language
      content: `Review by ${review.author?.name || "Anonymous"} from ${review.platform}\nRating: ${review.rating}/10\n${review.reviewText}`,
      metadata: {
        author: review.author?.name || "Anonymous",
        platform: review.platform,
        rating: review.rating,
        date: review.date,
        reviewText: review.reviewText,
      },
    }))
  } catch (error) {
    console.error("Error processing review documents:", error)
    throw new Error(
      `Review processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process blog post documents for embedding
 */
export async function processPostDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const posts = await extractAllPosts()
    const languagePosts = posts.filter(
      (post: any) => post.language === language,
    )

    const processedPosts: ProcessedDocument[] = []

    for (const post of languagePosts) {
      let content = `Title: ${post.title}\n`

      if (post.author) {
        content += `Author: ${post.author.name}\n`
      }

      if (post.publishedAt) {
        content += `Published: ${new Date(post.publishedAt).toLocaleDateString()}\n`
      }

      if (post.categories && post.categories.length > 0) {
        content += `Categories: ${post.categories.map((c: any) => c.title).join(", ")}\n`
      }

      if (post.body) {
        const plainText = portableTextToPlain(post.body)
        content += `Content: ${plainText}\n`
      }

      processedPosts.push({
        contentId: post._id,
        contentType: "post",
        language: post.language,
        content,
        metadata: {
          title: post.title,
          author: post.author?.name,
          publishedAt: post.publishedAt,
          categories: post.categories?.map((c: any) => c.title) || [],
          slug: post.slug,
        },
      })
    }

    return processedPosts
  } catch (error) {
    console.error("Error processing post documents:", error)
    throw new Error(
      `Post processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process home page content for embedding
 */
export async function processHomeDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const homeInfo = await extractHomeContent()

    if (!homeInfo) {
      return []
    }

    let content = `Villa Bruno Home Page\n`

    if (homeInfo.hero_title) {
      content += `Title: ${homeInfo.hero_title}\n`
    }

    if (homeInfo.hero_slogan) {
      content += `Slogan: ${homeInfo.hero_slogan}\n`
    }

    if (homeInfo.subtitle) {
      content += `Subtitle: ${homeInfo.subtitle}\n`
    }

    if (homeInfo.intro_body) {
      const plainText = portableTextToPlain(homeInfo.intro_body)
      content += `About: ${plainText}\n`
    }

    return [
      {
        contentId: "home-page",
        contentType: "home",
        language,
        content,
        metadata: {
          title: homeInfo.hero_title,
          slogan: homeInfo.hero_slogan,
          subtitle: homeInfo.subtitle,
          pageType: "home",
        },
      },
    ]
  } catch (error) {
    console.error("Error processing home documents:", error)
    throw new Error(
      `Home processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process amenity documents for embedding
 */
export async function processAmenityDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const amenities = await extractAllAmenities()
    const languageAmenities = amenities.filter(
      (amenity: any) => amenity.language === language,
    )

    return languageAmenities.map((amenity: any) => ({
      contentId: amenity._id,
      contentType: "amenity",
      language: amenity.language,
      content: `Amenity: ${amenity.title}\nCategory: ${amenity.category}\nDescription: ${amenity.description}`,
      metadata: {
        title: amenity.title,
        description: amenity.description,
        category: amenity.category,
        isFeatured: amenity.isFeatured || false,
        keywords: amenity.keywords || [],
      },
    }))
  } catch (error) {
    console.error("Error processing amenity documents:", error)
    throw new Error(
      `Amenity processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process pricing rule documents for embedding
 */
export async function processPricingDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const pricingRules = await extractAllPricingRules()
    const languagePricingRules = pricingRules.filter(
      (rule: any) => rule.language === language,
    )

    return languagePricingRules.map((rule: any) => ({
      contentId: rule._id,
      contentType: "pricing_rule",
      language: rule.language,
      content: `Pricing Rule: ${rule.title}\nType: ${rule.ruleType}\nDescription: ${rule.description}`,
      metadata: {
        title: rule.title,
        description: rule.description,
        ruleType: rule.ruleType,
        season: rule.season,
        basePrice: rule.basePrice,
        percentage: rule.percentage,
        fixedAmount: rule.fixedAmount,
        minimumNights: rule.minimumNights,
      },
    }))
  } catch (error) {
    console.error("Error processing pricing documents:", error)
    throw new Error(
      `Pricing processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process payment method documents for embedding
 */
export async function processPaymentDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const paymentMethods = await extractAllPaymentMethods()
    const languagePaymentMethods = paymentMethods.filter(
      (method: any) => method.language === language,
    )

    return languagePaymentMethods.map((method: any) => ({
      contentId: method._id,
      contentType: "payment_method",
      language: method.language,
      content: `Payment Method: ${method.title}\nType: ${method.methodType}\nDescription: ${method.description}`,
      metadata: {
        title: method.title,
        description: method.description,
        methodType: method.methodType,
        processor: method.processor,
        processingTime: method.processingTime,
        fees: method.fees,
        isRecommended: method.isRecommended || false,
      },
    }))
  } catch (error) {
    console.error("Error processing payment documents:", error)
    throw new Error(
      `Payment processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process cancellation policy documents for embedding
 */
export async function processCancellationDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const cancellationPolicy = await extractDefaultCancellationPolicy()

    if (!cancellationPolicy || cancellationPolicy.language !== language) {
      return []
    }

    let content = `Cancellation Policy: ${cancellationPolicy.title}\nType: ${cancellationPolicy.policyType}\n${cancellationPolicy.description}\n`

    if (
      cancellationPolicy.timeframes &&
      cancellationPolicy.timeframes.length > 0
    ) {
      content += "Cancellation Timeframes:\n"
      cancellationPolicy.timeframes.forEach((timeframe: any) => {
        content += `- ${timeframe.daysBeforeCheckIn}+ days before check-in: ${timeframe.refundPercentage}% refund\n`
        content += `  ${timeframe.description}\n`
      })
    }

    return [
      {
        contentId: "default-cancellation-policy",
        contentType: "cancellation_policy",
        language: cancellationPolicy.language,
        content,
        metadata: {
          title: cancellationPolicy.title,
          description: cancellationPolicy.description,
          policyType: cancellationPolicy.policyType,
          timeframes: cancellationPolicy.timeframes,
          modificationPolicy: cancellationPolicy.modificationPolicy,
          noShowPolicy: cancellationPolicy.noShowPolicy,
        },
      },
    ]
  } catch (error) {
    console.error("Error processing cancellation documents:", error)
    throw new Error(
      `Cancellation processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process logistics documents for embedding
 */
export async function processLogisticsDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const logistics = await extractAllLogistics()
    const languageLogistics = logistics.filter(
      (item: any) => item.language === language,
    )

    return languageLogistics.map((item: any) => ({
      contentId: item._id,
      contentType: "logistics",
      language: item.language,
      content: `Logistics: ${item.title}\nCategory: ${item.category}\nDescription: ${item.description}`,
      metadata: {
        title: item.title,
        description: item.description,
        category: item.category,
        checkInTime: item.checkInTime,
        checkOutTime: item.checkOutTime,
        instructions: item.instructions,
        contactInfo: item.contactInfo,
        isImportant: item.isImportant || false,
        keywords: item.keywords || [],
      },
    }))
  } catch (error) {
    console.error("Error processing logistics documents:", error)
    throw new Error(
      `Logistics processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Process all content types for a given language
 */
export async function processAllDocuments(
  language: string = "en",
): Promise<ProcessedDocument[]> {
  try {
    const [
      faqs,
      pages,
      tours,
      reviews,
      posts,
      home,
      amenities,
      pricing,
      payments,
      cancellations,
      logistics,
    ] = await Promise.all([
      processFAQDocuments(language),
      processPageDocuments(language),
      processTourDocuments(language),
      processReviewDocuments(language),
      processPostDocuments(language),
      processHomeDocuments(language),
      processAmenityDocuments(language),
      processPricingDocuments(language),
      processPaymentDocuments(language),
      processCancellationDocuments(language),
      processLogisticsDocuments(language),
    ])

    return [
      ...faqs,
      ...pages,
      ...tours,
      ...reviews,
      ...posts,
      ...home,
      ...amenities,
      ...pricing,
      ...payments,
      ...cancellations,
      ...logistics,
    ]
  } catch (error) {
    console.error("Error processing all documents:", error)
    throw new Error(
      `All documents processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Get content processor function for specific content type
 */
export function getContentProcessor(contentType: string) {
  const processors: Record<
    string,
    (language: string) => Promise<ProcessedDocument[]>
  > = {
    faq: processFAQDocuments,
    page: processPageDocuments,
    tour: processTourDocuments,
    review: processReviewDocuments,
    post: processPostDocuments,
    home: processHomeDocuments,
    amenity: processAmenityDocuments,
    pricing_rule: processPricingDocuments,
    payment_method: processPaymentDocuments,
    cancellation_policy: processCancellationDocuments,
    logistics: processLogisticsDocuments,
  }

  return processors[contentType]
}
