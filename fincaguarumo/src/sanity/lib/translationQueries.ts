/**
 * Contains shared GROQ queries for translation-related operations
 */

/**
 * Base query to check if a document has translations, either through metadata or slug matching
 * @param docId - The ID of the source document
 * @param docType - The type of the document
 * @param lang - The target language to check for
 */
export const hasTranslationQuery = `(
  _type == "translation.metadata" && $id in translations[].value._ref
) || (
  _type == $type && language == $lang && slug.current == *[_id == $id][0].slug.current
)`

/**
 * Query to count existing translations for a document
 */
export const translationCountQuery = `count(*[
  (_type == "translation.metadata" && ^._id in translations[].value._ref) ||
  (_type == ^._type && language != "en" && slug.current == ^.slug.current)
])`

/**
 * Query to check if a document has no translations
 */
export const hasNoTranslationsQuery = `!defined(*[
  (_type == "translation.metadata" && ^._id in translations[].value._ref) ||
  (_type == ^._type && language != "en" && slug.current == ^.slug.current)
][0]._id)`

/**
 * Types that can be translated
 */
export const translatableTypes = [
  "faq",
  "page",
  "post",
  "home",
  "tour",
] as const
export type TranslatableType = (typeof translatableTypes)[number]

/**
 * Query to get all untranslated documents
 */
export const getUntranslatedDocumentsQuery = `
  *[_type in $types && language == "en" && ${hasNoTranslationsQuery}] {
    _id,
    _type,
    title,
    question,
    answer, 
    subtitle, 
    description, 
    body,
    hero_body,
    hero_slogan,
    hero_title,
    intro_body,
    featured_content_title,
    featured_blog_title,
    "displayTitle": coalesce(
      title, 
      hero_title, 
      question, 
      "Untitled"
    )
  }
`
