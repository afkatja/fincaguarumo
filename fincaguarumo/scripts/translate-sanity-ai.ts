import "dotenv/config"
import { createClient } from "next-sanity"
import { languages } from "../src/config.js"
import {
  getTranslatableFields,
  getCopyAsIsFields,
} from "../src/config/translatable-fields.js"
import { translateWithRetry, getDefaultOptions, type TranslationOptions } from "../src/sanity/lib/translateText.js"
import { isPortableText, portableTextToPlain, plainToPortableText } from "../src/sanity/lib/portableTextHelper.js"

interface DocInfo {
  _id: string
  _type: string
  slug: string | null
  language: string
  [key: string]: any
}

export async function translateFieldValue(
  value: any,
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslationOptions,
): Promise<any> {
  if (value === null || value === undefined) return value

  // Portable Text (blockContent) fields
  if (isPortableText(value)) {
    const plainText = portableTextToPlain(value)
    if (plainText && !plainText.trim()) {
      console.log("⚠️  Field is empty, copying original")
      return value
    }

    try {
      const { translatedText } = await translateWithRetry(plainText, sourceLanguage, targetLanguage, options)
      if (!translatedText) {
        console.error(`❌ Failed to translate Portable Text`)
        return value
      }

      console.log(`✅ Translated Portable Text field`)
      return plainToPortableText(value, translatedText)
    } catch (error) {
      console.error(`❌ Failed to translate Portable Text`, error)
      return value
    }
  }

  // String fields
  if (typeof value === "string") {
    if (!value.trim()) return value

    try {
      const { translatedText } = await translateWithRetry(value, sourceLanguage, targetLanguage, options)
      if (!translatedText) {
        console.error(`❌ Failed to translate string field: ${value}`)
        return value
      }

      console.log(`✅ Translated string field`)
      return translatedText
    } catch (error) {
      console.error(`❌ Failed to translate string field: ${value}`, error)
      return value
    }
  }

  // Array fields (like highlightFeatures) - translate each string element
  if (Array.isArray(value)) {
    const translatedItems: any[] = []
    for (const item of value) {
      if (typeof item === "string") {
        try {
          const { translatedText } = await translateWithRetry(item, sourceLanguage, targetLanguage, options)
          translatedItems.push(translatedText || item)
        } catch (error) {
          console.error(`❌ Failed to translate array string item`, error)
          translatedItems.push(item)
        }
      } else if (typeof item === "object" && item !== null) {
        // For objects within arrays (e.g., highlightFeatures with title/description/icon)
        const translatedObj: any = {}
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === "string") {
            try {
              const { translatedText } = await translateWithRetry(val, sourceLanguage, targetLanguage, options)
              translatedObj[key] = translatedText || val
            } catch (error) {
              console.error(`❌ Failed to translate object field ${key}`, error)
              translatedObj[key] = val
            }
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
    lang => lang.value !== "en"
  )

  console.log("🌍 Starting bulk translation...")
  console.log("Target languages:", targetLanguages.map(l => `${l.value} (${l.title})`))

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

    // Fetch all English documents of this type
    const enDocs = await client.fetch(
      `*[_type == $type && language == "en" && defined(slug.current)]{
        _id,
        slug,
        _rev
      }`,
      { type },
    )

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
          // Check if translation already exists
          const existingDoc = await client.fetch(
            `*[_type == $type && slug.current == $slug && language == $targetCode][0]`,
            {
              type,
              slug: enDoc.slug?.current,
              targetCode,
            },
          )

          // Build base fields (non-translatable fields to copy as-is)
          const translatableFieldSet = new Set(getTranslatableFields(type))
          const copyAsIsFieldSet = new Set(getCopyAsIsFields(type))

          // Get all fields from the source doc, separate translatable vs copy-as-is
          const baseFields: { [key: string]: any } = {}
          const fieldsToTranslate: string[] = []

          const allFields = Object.entries(enDoc).filter(
            ([key]) =>
              !key.startsWith("_") && key !== "language" && key !== "slug",
          )

          for (const [key, value] of allFields) {
            if (copyAsIsFieldSet.has(key)) {
              // Copy as-is
              baseFields[key] = value
            } else if (translatableFieldSet.has(key)) {
              // Translate this field
              fieldsToTranslate.push(key)
            } else {
              // Unknown field - copy as-is for safety
              baseFields[key] = value
            }
          }

          // Check if translation already exists and is complete
          if (
            existingDoc &&
            fieldsToTranslate.length === 0 &&
            Object.keys(baseFields).length > 0
          ) {
            console.log(
              `    ⚠️  Translation for ${targetCode} already exists and is complete (doc: ${enDoc._id})`,
            )
            translatedDocIds.push(existingDoc._id)
            continue
          }

          // Translate the required fields
          const translatedFields: { [key: string]: any } = {}

          for (const field of fieldsToTranslate) {
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
                  translatedFields[field] = translated as any[]
                } else {
                  translatedFields[field] = translated
                }
                console.log(`    ✅ Translated ${field}`)
              } catch (error) {
                console.error(
                  `❌ Failed to translate ${field}:`,
                  error,
                )
              }
            }
          }

          // Also translate openGraph fields if present
          if (enDoc.openGraph) {
            const ogFields: string[] = []
            if (enDoc.openGraph.title) ogFields.push("title")
            if (enDoc.openGraph.description) ogFields.push("description")

            for (const field of ogFields) {
              try {
                const translated = await translateFieldValue(
                  enDoc.openGraph[field] as string,
                  "en",
                  targetCode,
                  options,
                )
                ;(translatedFields.openGraph = translatedFields.openGraph || {})[
                  field
                ] = translated as string
                console.log(`    ✅ Translated openGraph.${field}`)
              } catch (error) {
                console.error(
                  `❌ Failed to translate openGraph.${field}:`,
                  error,
                )
              }
            }
          }

          // Create or update the translated document
          let translatedDoc: any

          if (existingDoc) {
            // Update existing translation
            translatedDoc = await client
              .patch(existingDoc._id)
              .set({
                ...translatedFields,
                language: targetCode,
                ...baseFields,
              })
              .commit()
            console.log(`    🔄 Updated existing translation: ${translatedDoc._id}`)
          } else {
            // Create new translation
            translatedDoc = await client.create({
              _type: type,
              language: targetCode,
              slug: {
                _type: "slug",
                current: enDoc.slug?.current || "",
              },
              ...baseFields,
              ...translatedFields,
            })
            console.log(`    📝 Created new translation: ${translatedDoc._id}`)
          }

          translatedDocIds.push(translatedDoc._id)

        } catch (error) {
          console.error(
            `❌ Error processing document ${enDoc._id} to ${targetCode}:`,
            error,
          )
        }
      }

      // Update or create translation.metadata document
      if (translatedDocIds.length > 1) {
        try {
          console.log("🔗 Updating translation metadata...")

          // Check if translation.metadata already exists
          const existingMetadata = await client.fetch(
            `*[_type == "translation.metadata" && $docId in translations[].value._ref][0]`,
            { docId: enDocs[0]._id },
          )

          const translationRefs = translatedDocIds.map(id => ({
            _key: id,
            _type: "reference",
            _ref: id,
          }))

          if (existingMetadata) {
            await client
              .patch(existingMetadata._id)
              .set({ translations: translationRefs })
              .commit()
            console.log(
              `✅ Updated translation.metadata: ${existingMetadata._id}`,
            )
          } else {
            const metadata = await client.create({
              _type: "translation.metadata",
              translations: translationRefs,
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
      }

      console.log(
        `  ✅ Complete: ${targetCode} - ${translatedDocIds.length} documents processed`,
      )
    }
  }

  console.log("\n🎉 Bulk translation complete!")
}

// Run the script when invoked directly
if (process.argv[1] === new URL(import.meta.url).pathname || require.main === module) {
  translateSanityAI()
    .catch(err => {
      console.error("Bulk translation failed:", err)
      process.exit(1)
    })
}