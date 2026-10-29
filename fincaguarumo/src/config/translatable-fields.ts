/**
 * Translatable fields per schema type: which fields to translate (vs copy as-is vs skip)
 * Defined once and shared between API route and CLI script
 */
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  faq: ["question", "answer"],
  page: ["title", "subtitle", "description", "body"],
  post: ["title", "body"],
  tour: ["title", "description", "body"],
  home: [
    "title",
    "hero_title",
    "hero_slogan",
    "hero_body",
    "subtitle",
    "description",
    "intro_body",
    "featured_content_title",
    "featured_blog_title",
  ],
  activityBlock: ["children"],
  whyChooseVillaBruno: ["title", "CTA_button"],
  locationPage: ["title", "subtitle", "description", "body"],
  accommodation: [
    "title",
    "subtitle",
    "description",
    "summary",
    "body",
    "highlightFeatures",
  ],
}

/**
 * Non-translatable fields per schema type (copy as-is)
 * Fields that should be duplicated as-is across languages (not translated)
 */
export const COPY_AS_IS_FIELDS: Record<string, string[]> = {
  faq: ["category", "keywords", "showOnVillaBruno", "priority", "relatedQuestions"],
  page: ["slug", "mainImage", "slideshow", "categories", "faq", "isPublished", "showFAQ"],
  post: ["slug", "author", "mainImage", "categories", "publishedAt", "openGraph"],
  tour: ["slug", "mainImage", "slideshow", "body", "geo", "duration"],
  home: [
    "slug",
    "mainImage",
    "background_media",
    "background_media_poster",
    "locationDetails",
    "isPublished",
    "showBookingOptions",
    "showBookingDialog",
    "showFAQ",
    "featured_content_title",
    "featured_blog_title",
  ],
  activityBlock: [],
  whyChooseVillaBruno: [],
  locationPage: ["slug", "mainImage", "background_media"],
  accommodation: [
    "slug",
    "mainImage",
    "slideshow",
    "categories",
    "amenities",
    "pricingRules",
    "paymentMethods",
    "cancellationPolicy",
    "logistics",
    "checkInTime",
    "checkOutTime",
    "capacity",
    "bedrooms",
    "bathrooms",
    "propertyType",
    "location",
    "highlightFeatures",
    "isPublished",
    "showBookingOptions",
    "showFAQ",
  ],
}