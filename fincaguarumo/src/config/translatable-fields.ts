/**
 * Field treatment per schema type and field name.
 *
 * Single source of truth for which fields to translate vs copy-as-is.
 *
 * "translate"  - field value is translated via the translation provider
 * "copyAsIs"   - field value is duplicated as-is across languages (not translated)
 *
 * Fields not listed for a type default to "copyAsIs" (safe default: don't
 * translate unknown fields like booleans, numbers, images, objects).
 * Underscore fields (_id, _type, _rev, etc.), "language", and "slug" are
 * always handled separately by the translation routes.
 *
 * Adding a new document type? List its fields here once. The translate and
 * copy-fields routes derive their field sets from this config.
 */
export type FieldTreatment = "translate" | "copyAsIs"

export type FieldsConfig = Record<string, Record<string, FieldTreatment>>

export const FIELDS_CONFIG = {
  faq: {
    question: "translate",
    answer: "translate",
    answerBlockContent: "translate",
    category: "copyAsIs",
    keywords: "copyAsIs",
    showOnVillaBruno: "copyAsIs",
    priority: "copyAsIs",
    relatedQuestions: "copyAsIs",
  },
  page: {
    title: "translate",
    subtitle: "translate",
    description: "translate",
    body: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    slideshow: "copyAsIs",
    categories: "copyAsIs",
    faq: "copyAsIs",
    isPublished: "copyAsIs",
    showFAQ: "copyAsIs",
  },
  post: {
    title: "translate",
    body: "translate",
    slug: "copyAsIs",
    author: "copyAsIs",
    mainImage: "copyAsIs",
    categories: "copyAsIs",
    publishedAt: "copyAsIs",
    openGraph: "copyAsIs",
  },
  tour: {
    title: "translate",
    description: "translate",
    body: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    slideshow: "copyAsIs",
    geo: "copyAsIs",
    duration: "copyAsIs",
  },
  home: {
    title: "translate",
    hero_title: "translate",
    hero_slogan: "translate",
    hero_body: "translate",
    subtitle: "translate",
    description: "translate",
    intro_body: "translate",
    featured_content_title: "translate",
    featured_blog_title: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    background_media: "copyAsIs",
    background_media_poster: "copyAsIs",
    locationDetails: "copyAsIs",
    isPublished: "copyAsIs",
    showBookingOptions: "copyAsIs",
    showBookingDialog: "copyAsIs",
    showFAQ: "copyAsIs",
  },
  activityBlock: {
    title: "translate",
    subtitle: "translate",
    description: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    isPublished: "copyAsIs",
    displayOrder: "copyAsIs",
    activities: "copyAsIs",
    seoKeywords: "copyAsIs",
  },
  whyChooseVillaBruno: {
    title: "translate",
    subtitle: "translate",
    description: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    isPublished: "copyAsIs",
    displayOrder: "copyAsIs",
    comparisonTable: "copyAsIs",
    keyDifferentiators: "copyAsIs",
    idealFor: "copyAsIs",
    lessSuitableFor: "copyAsIs",
    seoKeywords: "copyAsIs",
  },
  locationPage: {
    title: "translate",
    subtitle: "translate",
    description: "translate",
    body: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    background_media: "copyAsIs",
  },
  accommodation: {
    title: "translate",
    subtitle: "translate",
    description: "translate",
    summary: "translate",
    body: "translate",
    highlightFeatures: "translate",
    slug: "copyAsIs",
    mainImage: "copyAsIs",
    slideshow: "copyAsIs",
    categories: "copyAsIs",
    amenities: "copyAsIs",
    pricingRules: "copyAsIs",
    paymentMethods: "copyAsIs",
    cancellationPolicy: "copyAsIs",
    logistics: "copyAsIs",
    checkInTime: "copyAsIs",
    checkOutTime: "copyAsIs",
    capacity: "copyAsIs",
    bedrooms: "copyAsIs",
    bathrooms: "copyAsIs",
    propertyType: "copyAsIs",
    location: "copyAsIs",
    isPublished: "copyAsIs",
    showBookingOptions: "copyAsIs",
    showBookingDialog: "copyAsIs",
    showFAQ: "copyAsIs",
    faq: "copyAsIs",
    displayReviews: "copyAsIs",
    activityBlocks: "copyAsIs",
    whyChooseVillaBruno: "copyAsIs",
  },
}

export type TranslatableDocType = keyof typeof FIELDS_CONFIG

/**
 * Returns the fields that should be translated for a given document type.
 */
export function getTranslatableFields(docType: string): string[] {
  const config = (FIELDS_CONFIG as unknown as Record<string, Record<string, FieldTreatment>>)[docType]
  if (!config) return []
  return Object.entries(config)
    .filter(([, treatment]) => treatment === "translate")
    .map(([field]) => field)
}

/**
 * Returns the fields that should be copied as-is for a given document type.
 */
export function getCopyAsIsFields(docType: string): string[] {
  const config = (FIELDS_CONFIG as unknown as Record<string, Record<string, FieldTreatment>>)[docType]
  if (!config) return []
  return Object.entries(config)
    .filter(([, treatment]) => treatment === "copyAsIs")
    .map(([field]) => field)
}

/**
 * Returns the treatment for a specific field on a document type.
 * Defaults to "copyAsIs" for unlisted fields (safe default).
 */
export function getFieldTreatment(
  docType: string,
  field: string,
): FieldTreatment {
  return (
    (FIELDS_CONFIG as unknown as Record<string, Record<string, FieldTreatment>>)[
      docType
    ]?.[field] ?? "copyAsIs"
  )
}

/**
 * Backward-compatible derived exports.
 * Translatable fields per schema type.
 */
export const TRANSLATABLE_FIELDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(FIELDS_CONFIG).map(([type, fields]) => [
    type,
    getTranslatableFields(type),
  ]),
) as Record<string, string[]>

/**
 * Non-translatable fields per schema type (copy as-is).
 */
export const COPY_AS_IS_FIELDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(FIELDS_CONFIG).map(([type, fields]) => [
    type,
    getCopyAsIsFields(type),
  ]),
) as Record<string, string[]>
