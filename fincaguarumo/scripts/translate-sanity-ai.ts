import "dotenv/config"
import { createClient } from "next-sanity"
import type { PortableTextBlock } from "@portabletext/types"
import { languages } from "../src/config.js"
import {
  getTranslatableFields,
  getCopyAsIsFields,
} from "../src/config/translatable-fields.js"
import { translateWithRetry, getDefaultOptions, type TranslationOptions } from "../src/sanity/lib/translateText.js"
import { isPortableText, portableTextToPlain } from "../src/sanity/lib/portableTextHelper.js"

interface DocInfo {
  _id: string
  _type: string
  slug: { _type: "slug"; current: string } | null
  language: string
  [key: string]: unknown
}

type SanityDoc = {
  _id: string
  [key: string]: unknown
}

type WritePayload = {
  [key: string]: unknown
}

/**
 * Translate Portable Text blocks span by span, preserving blocks, span marks,
 * and annotations. Non-translatable content (non-span children, empty spans)
 * is left unchanged; blocks are never collapsed into unmarked spans.
 */
async function translatePortableTextBlocks(
  blocks: PortableTextBlock[],
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslationOptions,
): Promise<PortableTextBlock[]> {
  const hasTranslatableText = blocks.some(
    (block) =>
      block._type === "block" &&
      Array.isArray(block.children) &&
      block.children.some(
        (child) =>
          child._type === "span" &&
          typeof child.text === "string" &&
          child.text.trim().length > 0,
      ),
  )
  if (!hasTranslatableText) {
    console.log("⚠️  Field is empty, copying original")
    return blocks
  }

  return Promise.all(
    blocks.map(async (block) => {
      if (block._type !== "block" || !Array.isArray(block.children)) {
        return block
      }
      return {
        ...block,
        children: await Promise.all(
          block.children.map(async (child) => {
            if (child._type !== "span" || typeof child.text !== "string") {
              return child
            }
            if (!child.text.trim()) return child
            try {
              const { translatedText } = await translateWithRetry(
                child.text,
                sourceLanguage,
                targetLanguage,
                options,
              )
              if (!translatedText) return child
              return { ...child, text: translatedText }
            } catch (error) {
              console.error(`❌ Failed to translate Portable Text span`, error)
              throw error
            }
          }),
        ),
      }
    }),
  )
}

/**
 * Translate a single field value. Returns the value as-is for null/undefined
 * or empty input (a skip, not a failure). Throws on provider failure so the
 * caller can recognise a failed translation and omit it from the patch.
 */
export async function translateFieldValue(
  value: unknown,
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslationOptions,
): Promise<unknown> {
  if (value === null || value === undefined) return value

  // Portable Text (blockContent) fields
  if (isPortableText(value)) {
    return translatePortableTextBlocks(
      value as PortableTextBlock[],
      sourceLanguage,
      targetLanguage,
      options,
    )
  }

  // String fields
  if (typeof value === "string") {
    if (!value.trim()) return value
    const { translatedText } = await translateWithRetry(
      value,
      sourceLanguage,
      targetLanguage,
      options,
    )
    if (!translatedText) {
      throw new Error(`Failed to translate string field: ${value}`)
    }
    return translatedText
  }

  // Array fields (like highlightFeatures) - translate each string element
  if (Array.isArray(value)) {
    const translatedItems: unknown[] = []
    for (const item of value) {
      if (typeof item === "string") {
        const { translatedText } = await translateWithRetry(
          item,
          sourceLanguage,
          targetLanguage,
          options,
        )
        translatedItems.push(translatedText || item)
      } else if (typeof item === "object" && item !== null) {
        const translatedObj: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === "string") {
            const { translatedText } = await translateWithRetry(
              val,
              sourceLanguage,
              targetLanguage,
              options,
            )
            translatedObj[key] = translatedText || val
          } else {
            translatedObj[key] = val
          }
        }
        translatedItems.push(translatedObj)
      } else {
        translatedItems.push(item)
      }
    }
    return translatedItems
  }

  // Fallback: return as-is
  return value
}

function fieldHasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function fieldToPlain(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(fieldToPlain).join("||")
  if (isPortableText(value)) return portableTextToPlain(value as PortableTextBlock[])
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function fieldValueChanged(source: unknown, target: unknown): boolean {
  return fieldToPlain(source) !== fieldToPlain(target)
}

/**
 * Main translation function
 */
async function translateSanityAI(
  options: TranslationOptions = getDefaultOptions(),
): Promise<void> {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN,
    apiVersion: process.env.SANITY_STUDIO_API_VERSION,
  })

  // Filter languages: exclude English, get all others
  const targetLanguages = languages.filter(
    lang => lang.value !== "en",
  )

  console.log("🌍 Starting bulk translation...")
  console.log(
    "Target languages:",
    targetLanguages.map(l => `${l.value} (${l.title})`),
  )

  // Translatable types based on the plan
  const translatableTypes = [
    "page",
    "post",
    "tour",
    "home",
    "faq",
    "activityBlock",
    "whyChooseVillaBruno",
    "locationPage",
    "accommodation",
  ]

  for (const type of translatableTypes) {
    console.log(`\n📄 Processing type: ${type}`)

    // Fetch all English documents of this type (all fields needed to populate
    // fieldsToTranslate and baseFields; system fields are excluded from the
    // write payload separately).
    const enDocs = (await client.fetch(
      `*[_type == $type && language == "en" && defined(slug.current)]`,
      { type },
    )) as DocInfo[]

    console.log(`  Found ${enDocs.length} English documents`)

    if (enDocs.length === 0) {
      console.log(`  ⚠️  No English documents found for type: ${type}`)
      continue
    }

    // Process each target language
    for (const targetLang of targetLanguages) {
      const targetCode = targetLang.value
      console.log(
        `  🔄 Translating to ${targetCode} (${targetLang.title})...`,
      )

      const translatedDocIds: string[] = []

      for (const enDoc of enDocs) {
        try {
          // Check if translation already exists for this source + target
          const existingDoc = (await client.fetch(
            `*[_type == $type && slug.current == $slug && language == $targetCode][0]`,
            {
              type,
              slug: enDoc.slug?.current,
              targetCode,
            },
          )) as SanityDoc | null

          // Build base fields (copy-as-is) and list of translatable fields
          const translatableFieldSet = new Set(getTranslatableFields(type))
          const copyAsIsFieldSet = new Set(getCopyAsIsFields(type))

          const baseFields: WritePayload = {}
          const fieldsToTranslate: string[] = []

          const allFields = Object.entries(enDoc).filter(
            ([key]) =>
              !key.startsWith("_") && key !== "language" && key !== "slug",
          )

          for (const [key, value] of allFields) {
            if (copyAsIsFieldSet.has(key)) {
              baseFields[key] = value
            } else if (translatableFieldSet.has(key)) {
              fieldsToTranslate.push(key)
            } else {
              // Unknown field - copy as-is for safety
              baseFields[key] = value
            }
          }

          // Translate only missing or source-changed fields; preserve
          // completed, unchanged target fields (including reviewed translations).
          const fieldsNeedingTranslation = existingDoc
            ? fieldsToTranslate.filter(
                (field) =>
                  !fieldHasValue(existingDoc[field]) ||
                  fieldValueChanged(enDoc[field], existingDoc[field]),
              )
            : fieldsToTranslate

          // Check if translation already exists and is complete
          if (existingDoc && fieldsNeedingTranslation.length === 0) {
            console.log(
              `    ⚠️  Translation for ${targetCode} already exists and is complete (doc: ${enDoc._id})`,
            )
            translatedDocIds.push(existingDoc._id)
            continue
          }

          // Translate the required fields
          const translatedFields: WritePayload = {}

          for (const field of fieldsNeedingTranslation) {
            if (enDoc[field] !== undefined && enDoc[field] !== null) {
              try {
                const translated = await translateFieldValue(
                  enDoc[field],
                  "en",
                  targetCode,
                  options,
                )

                // Handle highlightFeatures array specially - it's an array of objects
                if (field === "highlightFeatures" && Array.isArray(translated)) {
                  translatedFields[field] = translated
                } else {
                  translatedFields[field] = translated
                }
                console.log(`    ✅ Translated ${field}`)
              } catch (error) {
                console.error(`❌ Failed to translate ${field}:`, error)
              }
            }
          }

          // Also translate openGraph fields if present
          if (enDoc.openGraph && typeof enDoc.openGraph === "object") {
            const ogFields: string[] = []
            const openGraph = enDoc.openGraph as Record<string, unknown>
            if (openGraph.title) ogFields.push("title")
            if (openGraph.description) ogFields.push("description")

            for (const field of ogFields) {
              try {
                const translated = await translateFieldValue(
                  openGraph[field],
                  "en",
                  targetCode,
                  options,
                )
                const ogBlock: Record<string, unknown> =
                  (translatedFields.openGraph as Record<string, unknown> | undefined) ??
                  {}
                ogBlock[field] = translated
                translatedFields.openGraph = ogBlock
                console.log(`    ✅ Translated openGraph.${field}`)
              } catch (error) {
                console.error(
                  `❌ Failed to translate openGraph.${field}:`,
                  error,
                )
              }
            }
          }

          // Merge translated openGraph over base openGraph so translated title
          // and description take precedence while copied image and URL remain.
          let mergedOpenGraph: unknown
          if (
            baseFields.openGraph &&
            translatedFields.openGraph &&
            typeof baseFields.openGraph === "object" &&
            typeof translatedFields.openGraph === "object"
          ) {
            mergedOpenGraph = {
              ...baseFields.openGraph,
              ...translatedFields.openGraph,
            }
          } else {
            mergedOpenGraph =
              translatedFields.openGraph ?? baseFields.openGraph
          }

          // Create or update the translated document
          let translatedDoc: SanityDoc | null = null

          if (existingDoc) {
            // Update existing translation
            const setPayload: WritePayload = {
              ...baseFields,
              ...translatedFields,
              language: targetCode,
            }
            if (mergedOpenGraph !== undefined) {
              setPayload.openGraph = mergedOpenGraph
            }
            translatedDoc = (await client
              .patch(existingDoc._id)
              .set(setPayload)
              .commit()) as SanityDoc
            console.log(
              `    🔄 Updated existing translation: ${translatedDoc._id}`,
            )
          } else {
            // Create new translation
            const createPayload: {
              _type: string
              language: string
              slug: { _type: "slug"; current: string }
              [key: string]: unknown
            } = {
              _type: type,
              language: targetCode,
              slug: {
                _type: "slug",
                current: enDoc.slug?.current || "",
              },
              ...baseFields,
              ...translatedFields,
            }
            if (mergedOpenGraph !== undefined) {
              createPayload.openGraph = mergedOpenGraph
            }
            translatedDoc = (await client.create(createPayload)) as SanityDoc
            console.log(`    📝 Created new translation: ${translatedDoc._id}`)
          }

          translatedDocIds.push(translatedDoc._id)

          // Update translation metadata for this source document, merging the
          // new target-language reference with any existing language references
          // rather than replacing metadata with unrelated translated documents.
          try {
            const existingMetadata = (await client.fetch(
              `*[_type == "translation.metadata" && $docId in translations[].value._ref][0]`,
              { docId: enDoc._id },
            )) as SanityDoc | null

            const translationRef = {
              _key: translatedDoc._id,
              _type: "reference",
              value: { _type: "reference", _ref: translatedDoc._id },
            }

            const existingTranslations =
              (existingMetadata?.translations as unknown[]) ?? []
            const filtered = existingTranslations.filter(
              (r: unknown) =>
                (r as { value?: { _ref?: string } })?.value?._ref !==
                translatedDoc._id,
            )
            const translations = [...filtered, translationRef]

            if (existingMetadata) {
              await client
                .patch(existingMetadata._id)
                .set({ translations })
                .commit()
              console.log(
                `✅ Updated translation.metadata: ${existingMetadata._id}`,
              )
            } else {
              const metadata = await client.create({
                _type: "translation.metadata",
                translations,
              })
              console.log(`✅ Created translation.metadata: ${metadata._id}`)
            }
          } catch (error) {
            console.error(
              "⚠️  Failed to update translation metadata:",
              error,
            )
            // Don't fail the whole operation if metadata update fails
          }
        } catch (error) {
          console.error(
            `❌ Error processing document ${enDoc._id} to ${targetCode}:`,
            error,
          )
        }
      }

      console.log(
        `  ✅ Complete: ${targetCode} - ${translatedDocIds.length} documents processed`,
      )
    }
  }

  console.log("\n🎉 Bulk translation complete!")
}

// Run the script when invoked directly
if (process.argv[1].includes("translate-sanity-ai.ts")) {
  translateSanityAI()
    .catch(err => {
      console.error("Bulk translation failed:", err)
      process.exit(1)
    })
}
