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
    "translationCount": coalesce(length(
      *[_type == ^._type && language != "en" && (
        (!defined(^.slug.current) && !defined(slug.current)) ||
        (defined(^.slug.current) && defined(slug.current) && slug.current == ^.slug.current)
      )]
    ), 0),
    "translatedLanguages": *[
      _type == ^._type && language != "en" && (
        (!defined(^.slug.current) && !defined(slug.current)) ||
        (defined(^.slug.current) && defined(slug.current) && slug.current == ^.slug.current)
      )
    ]{
      language,
      "translatedTitle": coalesce(title, hero_title, question, ""),
      "translatedBody": coalesce(body, hero_body, answer, intro_body, description, ""),
    }
  }
`
