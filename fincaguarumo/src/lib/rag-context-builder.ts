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
} from "./sanity-data-extractor"
import { portableTextToPlain } from "@/sanity/lib/portableTextHelper"

export interface RAGContext {
  faqs?: any[]
  pageInfo?: any
  tours?: any[]
  homeInfo?: any
  reviews?: any[]
  posts?: any[]
  averageRating?: any
}

// Build context based on user query and page context
export async function buildRAGContext(
  userQuery: string,
  pageContext: { page: string; slug?: string; locale: string },
): Promise<string> {
  const context: RAGContext = {}
  let contextText = ""

  const lowerQuery = userQuery.toLowerCase()

  // Extract relevant FAQs based on query
  const faqs = await extractAllFAQs()
  const relevantFAQs = faqs.filter(
    (faq: any) =>
      faq.language === pageContext.locale &&
      (faq.question.toLowerCase().includes(lowerQuery) ||
        faq.answer.toLowerCase().includes(lowerQuery) ||
        faq.keywords?.some((k: string) =>
          k.toLowerCase().includes(lowerQuery),
        )),
  )

  if (relevantFAQs.length > 0) {
    context.faqs = relevantFAQs.slice(0, 5) // Limit to top 5
    contextText += "\n\n=== RELEVANT FAQs ===\n"
    context.faqs?.forEach((faq: any, i: number) => {
      contextText += `\nQ${i + 1}: ${faq.question}\nA: ${faq.answer}\n`
    })
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
    lowerQuery.includes("tour") ||
    lowerQuery.includes("activity") ||
    lowerQuery.includes("attraction") ||
    lowerQuery.includes("excursion") ||
    lowerQuery.includes("trip")
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
    lowerQuery.includes("review") ||
    lowerQuery.includes("rating") ||
    lowerQuery.includes("feedback") ||
    lowerQuery.includes("guest") ||
    lowerQuery.includes("experience")
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
    lowerQuery.includes("blog") ||
    lowerQuery.includes("article") ||
    lowerQuery.includes("post") ||
    lowerQuery.includes("local") ||
    lowerQuery.includes("area") ||
    lowerQuery.includes("nearby") ||
    lowerQuery.includes("around")
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
