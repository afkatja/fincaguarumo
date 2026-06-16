import { client } from "@/sanity/lib/client"
import { groq } from "next-sanity"

// Extract all FAQs with categories
export async function extractAllFAQs() {
  const query = groq`*[_type == "faq"] | order(displayOrder asc) {
    _id,
    question,
    answer,
    keywords,
    category->{title, slug},
    language,
    showOnVillaBruno,
    priority,
    intent,
    relatedQuestions[]->{_id, question}
  }`
  return await client.fetch(query)
}

// Extract all amenities
export async function extractAllAmenities() {
  const query = groq`*[_type == "amenities"] | order(displayOrder asc) {
    _id,
    title,
    slug,
    category,
    description,
    icon,
    image,
    isFeatured,
    keywords,
    language
  }`
  return await client.fetch(query)
}

// Extract amenities by category
export async function extractAmenitiesByCategory(category: string) {
  const query = groq`*[_type == "amenities" && category == $category] | order(displayOrder asc) {
    _id,
    title,
    category,
    description,
    icon,
    image,
    isFeatured,
    keywords,
    language
  }`
  return await client.fetch(query, { category })
}

// Extract featured amenities
export async function extractFeaturedAmenities() {
  const query = groq`*[_type == "amenities" && isFeatured == true] | order(displayOrder asc) {
    _id,
    title,
    category,
    description,
    icon,
    image,
    keywords,
    language
  }`
  return await client.fetch(query)
}

// Extract all pricing rules
export async function extractAllPricingRules() {
  const query = groq`*[_type == "pricingRules" && isActive == true] | order(displayOrder asc) {
    _id,
    title,
    ruleType,
    season,
    startDate,
    endDate,
    basePrice,
    percentage,
    fixedAmount,
    minimumNights,
    description,
    language,
    isActive,
    displayOrder
  }`
  return await client.fetch(query)
}

// Extract pricing rules by type
export async function extractPricingRulesByType(ruleType: string) {
  const query = groq`*[_type == "pricingRules" && ruleType == $ruleType && isActive == true] | order(displayOrder asc) {
    _id,
    title,
    ruleType,
    season,
    startDate,
    endDate,
    basePrice,
    percentage,
    fixedAmount,
    minimumNights,
    description,
    language,
    isActive,
    displayOrder
  }`
  return await client.fetch(query, { ruleType })
}

// Get effective pricing rules for a specific accommodation and date range
export async function getEffectivePricingRules(
  accommodationSlug: string,
  checkInDate?: Date,
) {
  const query = groq`*[_type == "accommodation" && slug.current == $slug && isPublished == true][0] {
    pricingRules[]->{ 
      _id,
      title,
      ruleType,
      season,
      startDate,
      endDate,
      basePrice,
      percentage,
      fixedAmount,
      minimumNights,
      description,
      language,
      isActive,
      displayOrder
    }
  }`
  const result = await client.fetch(query, { slug: accommodationSlug })

  if (!result || !result.pricingRules) {
    return []
  }

  // Filter rules based on date if provided
  if (checkInDate) {
    return result.pricingRules.filter((rule: any) => {
      if (rule.ruleType === "seasonal" && rule.startDate && rule.endDate) {
        const checkDate = new Date(checkInDate)
        const start = new Date(rule.startDate)
        const end = new Date(rule.endDate)
        return checkDate >= start && checkDate <= end
      }
      return true
    })
  }

  return result.pricingRules
}

// Extract all payment methods
export async function extractAllPaymentMethods() {
  const query = groq`*[_type == "paymentMethods" && isAvailable == true] | order(displayOrder asc) {
    _id,
    title,
    methodType,
    processor,
    description,
    processingTime,
    fees,
    supportedCards,
    instructions,
    isRecommended,
    icon,
    language
  }`
  return await client.fetch(query)
}

// Extract recommended payment methods
export async function extractRecommendedPaymentMethods() {
  const query = groq`*[_type == "paymentMethods" && isAvailable == true && isRecommended == true] | order(displayOrder asc) {
    _id,
    title,
    methodType,
    processor,
    description,
    processingTime,
    fees,
    supportedCards,
    instructions,
    icon,
    language
  }`
  return await client.fetch(query)
}

// Extract all cancellation policies
export async function extractAllCancellationPolicies() {
  const query = groq`*[_type == "cancellationPolicies" && isActive == true] | order(displayOrder asc) {
    _id,
    title,
    policyType,
    timeframes,
    description,
    modificationsAllowed,
    modificationPolicy,
    noShowPolicy,
    exceptions,
    isDefault,
    language
  }`
  return await client.fetch(query)
}

// Extract default cancellation policy
export async function extractDefaultCancellationPolicy() {
  const query = groq`*[_type == "cancellationPolicies" && isActive == true && isDefault == true][0] {
    _id,
    title,
    policyType,
    timeframes,
    description,
    modificationsAllowed,
    modificationPolicy,
    noShowPolicy,
    exceptions,
    language
  }`
  return await client.fetch(query)
}

// Extract all logistics information
export async function extractAllLogistics() {
  const query = groq`*[_type == "logistics"] | order(displayOrder asc) {
    _id,
    title,
    category,
    checkInTime,
    checkOutTime,
    earlyCheckIn,
    earlyCheckInFee,
    lateCheckOut,
    lateCheckOutFee,
    description,
    instructions,
    contactInfo,
    address,
    distance,
    isImportant,
    keywords,
    language
  }`
  return await client.fetch(query)
}

// Extract logistics by category
export async function extractLogisticsByCategory(category: string) {
  const query = groq`*[_type == "logistics" && category == $category] | order(displayOrder asc) {
    _id,
    title,
    category,
    checkInTime,
    checkOutTime,
    earlyCheckIn,
    earlyCheckInFee,
    lateCheckOut,
    lateCheckOutFee,
    description,
    instructions,
    contactInfo,
    address,
    distance,
    isImportant,
    keywords,
    language
  }`
  return await client.fetch(query, { category })
}

// Extract important logistics information
export async function extractImportantLogistics() {
  const query = groq`*[_type == "logistics" && isImportant == true] | order(displayOrder asc) {
    _id,
    title,
    category,
    checkInTime,
    checkOutTime,
    earlyCheckIn,
    earlyCheckInFee,
    lateCheckOut,
    lateCheckOutFee,
    description,
    instructions,
    contactInfo,
    address,
    distance,
    keywords,
    language
  }`
  return await client.fetch(query)
}

// Search amenities by keywords
export async function searchAmenities(
  searchTerm: string,
  language: string = "en",
) {
  const searchQuery = groq`*[_type == "amenities" && language == $language && (
    title match $searchTerm ||
    description match $searchTerm ||
    keywords match $searchTerm ||
    category match $searchTerm
  )] | order(displayOrder asc) {
    title,
    category,
    description,
    icon,
    isFeatured,
    keywords
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Search logistics by keywords
export async function searchLogistics(
  searchTerm: string,
  language: string = "en",
) {
  const searchQuery = groq`*[_type == "logistics" && language == $language && (
    title match $searchTerm ||
    description match $searchTerm ||
    keywords match $searchTerm ||
    category match $searchTerm
  )] | order(displayOrder asc) {
    title,
    category,
    description,
    instructions,
    isImportant,
    keywords
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Extract FAQs by category
export async function extractFAQsByCategory(categorySlug: string) {
  const query = groq`*[_type == "faq" && category->slug == $categorySlug] | order(displayOrder asc) {
    _id,
    question,
    answer,
    keywords,
    category->{title, slug},
    language
  }`
  return await client.fetch(query, { categorySlug })
}

// Extract page content (villa descriptions)
export async function extractPageContent(slug: string) {
  const query = groq`*[_type == "page" && slug.current == $slug][0] {
    title,
    subtitle,
    description,
    body,
    language,
    price,
    showBookingOptions,
    showBookingDialog,
    categories[]->{title}
  }`
  return await client.fetch(query, { slug })
}

// Extract all villa pages
export async function extractAllPages() {
  const query = groq`*[_type == "page" && isPublished == true] {
    title,
    subtitle,
    description,
    slug,
    language,
    price,
    showBookingOptions,
    categories[]->{title}
  }`
  return await client.fetch(query)
}

// Extract tour information
export async function extractAllTours() {
  const query = groq`*[_type == "tour" && isPublished == true] | order(dateAdded desc) {
    title,
    description,
    location,
    duration,
    price,
    language,
    slug,
    isFeatured,
    isNew
  }`
  return await client.fetch(query)
}

// Extract tour by slug
export async function extractTourBySlug(slug: string) {
  const query = groq`*[_type == "tour" && slug.current == $slug][0] {
    title,
    description,
    location,
    duration,
    price,
    language,
    slug,
    isFeatured,
    isNew,
    body
  }`
  return await client.fetch(query, { slug })
}

// Extract home page content
export async function extractHomeContent() {
  const query = groq`*[_type == "home"][0] {
    hero_title,
    hero_slogan,
    subtitle,
    hero_body,
    intro_body,
    language
  }`
  return await client.fetch(query)
}

// Extract property configuration for chatbot (pricing, capacity, etc.)
export async function extractPropertyConfig() {
  const query = groq`{
    "property": *[_type == "accommodation" && isPublished == true][0] {
      propertyType,
      title,
      subtitle,
      description,
      price,
      capacity,
      bedrooms,
      bathrooms,
      location,
      highlightFeatures,
      amenities[]-> {
        title,
        category,
        description,
        icon,
        isFeatured,
        keywords,
        language
      },
      pricingRules[]-> {
        _id,
        title,
        ruleType,
        season,
        startDate,
        endDate,
        basePrice,
        percentage,
        fixedAmount,
        minimumNights,
        description,
        language,
        isActive,
        displayOrder
      },
      paymentMethods[]-> {
        title,
        methodType,
        processor,
        description,
        isRecommended
      },
      cancellationPolicy-> {
        title,
        policyType,
        description,
        timeframes
      }
    },
    "home": *[_type == "home"][0] {
      hero_title,
      hero_slogan,
      subtitle,
      hero_body,
      intro_body,
      language
    },
    "basePricing": *[_type == "pricingRules" && ruleType == "base_rate" && isActive == true][0] {
      basePrice,
      title,
      description
    },
    "pricingRules": *[_type == "pricingRules" && isActive == true] | order(displayOrder asc) {
      _id,
      title,
      ruleType,
      season,
      startDate,
      endDate,
      basePrice,
      percentage,
      fixedAmount,
      minimumNights,
      description,
      language,
      isActive,
      displayOrder
    },
    "paymentMethods": *[_type == "paymentMethods" && isAvailable == true] {
      title,
      methodType,
      processor,
      description,
      isRecommended
    } | order(displayOrder asc),
    "cancellationPolicy": *[_type == "cancellationPolicies" && isActive == true && isDefault == true][0] {
      title,
      policyType,
      description,
      timeframes
    }
  }`
  return await client.fetch(query)
}

// Extract all reviews
export async function extractAllReviews() {
  const query = groq`*[_type == "review"] | order(date desc) {
    _id,
    platform,
    author->{name, location, photoURI},
    rating,
    date,
    reviewText,
    photoUrl
  }`
  return await client.fetch(query)
}

// Extract reviews by platform
export async function extractReviewsByPlatform(platform: "airbnb" | "booking") {
  const query = groq`*[_type == "review" && platform == $platform] | order(date desc) {
    _id,
    author->{name, location, photoURI},
    rating,
    date,
    reviewText,
    photoUrl
  }`
  return await client.fetch(query, { platform })
}

// Extract top-rated reviews
export async function extractTopReviews(limit: number = 10) {
  const query = groq`*[_type == "review"] | order(rating desc, date desc)[0...$limit] {
    _id,
    platform,
    author->{name, location, photoURI},
    rating,
    date,
    reviewText,
    photoUrl
  }`
  return await client.fetch(query, { limit })
}

// Extract all blog posts
export async function extractAllPosts() {
  const query = groq`*[_type == "post" && isPublished == true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    language,
    publishedAt,
    mainImage{
      alt,
      "url": asset->url
    },
    author->{name},
    categories[]->{title},
    body
  }`
  return await client.fetch(query)
}

// Extract posts by category
export async function extractPostsByCategory(categoryTitle: string) {
  const query = groq`*[_type == "post" && isPublished == true && $categoryTitle in categories[]->title] | order(publishedAt desc) {
    _id,
    title,
    slug,
    language,
    publishedAt,
    mainImage{
      alt,
      "url": asset->url
    },
    author->{name},
    categories[]->{title},
    body
  }`
  return await client.fetch(query, { categoryTitle })
}

// Extract post by slug
export async function extractPostBySlug(slug: string) {
  const query = groq`*[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    language,
    publishedAt,
    mainImage{
      alt,
      "url": asset->url
    },
    author->{name},
    categories[]->{title},
    body
  }`
  return await client.fetch(query, { slug })
}

// Search FAQs by keywords
export async function searchFAQs(searchTerm: string, language: string = "en") {
  const searchQuery = groq`*[_type == "faq" && language == $language && (
    question match $searchTerm ||
    answer match $searchTerm ||
    keywords match $searchTerm
  )] | order(displayOrder asc) {
    question,
    answer,
    category->{title},
    keywords
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Search posts by keywords
export async function searchPosts(searchTerm: string, language: string = "en") {
  const searchQuery = groq`*[_type == "post" && isPublished == true && language == $language && (
    title match $searchTerm ||
    body match $searchTerm
  )] | order(publishedAt desc) {
    title,
    slug,
    publishedAt,
    author->{name},
    categories[]->{title}
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Search tours by keywords
export async function searchTours(searchTerm: string, language: string = "en") {
  const searchQuery = groq`*[_type == "tour" && isPublished == true && language == $language && (
    title match $searchTerm ||
    description match $searchTerm ||
    location match $searchTerm
  )] | order(dateAdded desc) {
    title,
    slug,
    description,
    location,
    duration,
    price,
    isFeatured
  }`
  return await client.fetch(searchQuery, {
    searchTerm: `*${searchTerm}*`,
    language,
  })
}

// Get average rating from reviews
export async function getAverageRating() {
  const query = groq`{
    "average": round(avg(*[_type == "review"].rating) * 10) / 10,
    "total": count(*[_type == "review"]),
    "airbnb": count(*[_type == "review" && platform == "airbnb"]),
    "booking": count(*[_type == "review" && platform == "booking"])
  }`
  return await client.fetch(query)
}
