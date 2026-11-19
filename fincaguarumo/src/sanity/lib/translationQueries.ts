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
  _type == $type && language == $lang && defined(slug.current) && slug.current == *[_id == $id][0].slug.current
)`

/**
 * Query to count existing translations for a document
 *
 * Counts distinct counterpart documents (slug-matched targets plus documents
 * referenced through translation.metadata), excluding the metadata container
 * itself. Slugless documents cannot match.
 */
export const translationCountQuery = `count(*[
  _type != "translation.metadata" && _id in (
    *[_type == ^._type && language != "en" && defined(slug.current) && defined(^.slug.current) && slug.current == ^.slug.current]._id
    +
    *[_type == "translation.metadata" && ^._id in translations[].value._ref].translations[].value._ref
  )
])`

/**
 * Query to check if a document has no translations
 */
export const hasNoTranslationsQuery = `!defined(*[
  _type != "translation.metadata" && _id in (
    *[_type == ^._type && language != "en" && defined(slug.current) && defined(^.slug.current) && slug.current == ^.slug.current]._id
    +
    *[_type == "translation.metadata" && ^._id in translations[].value._ref].translations[].value._ref
  )
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
  "activityBlock",
  "whyChooseVillaBruno",
  "locationPage",
  "accommodation",
] as const
export type TranslatableType = (typeof translatableTypes)[number]

/**
 * Query to get all translatable documents with translation counts
 */
export const getTranslatableDocumentsQuery = `
  *[_type in $types && language == "en"] {
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
    ),
    "translationCount": count(*[
      _type != "translation.metadata" && _id in (
        *[_type == ^._type && language != "en" && defined(slug.current) && defined(^.slug.current) && slug.current == ^.slug.current]._id
        +
        *[_type == "translation.metadata" && ^._id in translations[].value._ref].translations[].value._ref
      )
    ]),
    "translatedLanguages": *[
      _type == ^._type && language != "en" && defined(slug.current) && defined(^.slug.current) && slug.current == ^.slug.current
    ][].language
  }
`
