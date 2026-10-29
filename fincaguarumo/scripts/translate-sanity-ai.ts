import "dotenv/config"
import { createClient } from "next-sanity"
import { languages } from "../src/config.js"
import { TRANSLATABLE_FIELDS, COPY_AS_IS_FIELDS } from "../src/config/translatable-fields.js"

type TranslateProvider = "google" | "ollama" | "libretranslate" | "huggingface"

interface TranslateOptions {
  provider: TranslateProvider
  ollamaHost?: string
  ollamaModel?: string
  libretranslateUrl?: string
  huggingfaceToken?: string
  huggingfaceModel?: string
}

const DEFAULT_PROVIDER: TranslateProvider = "google"

function getProvider(): TranslateProvider {
  return (
    (process.env.TRANSLATION_PROVIDER as TranslateProvider) || DEFAULT_PROVIDER
  )
}

function getOptions(): TranslateOptions {
  return {
    provider: getProvider(),
    ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
    libretranslateUrl:
      process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate",
    huggingfaceToken: process.env.HUGGINGFACE_TOKEN,
    huggingfaceModel:
      process.env.HUGGINGFACE_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct",
  }
}

/**
 * Check if a field value is Portable Text (blockContent)
 */
function isPortableText(fieldValue: any): fieldValue is any {
  return (
    fieldValue &&
    typeof fieldValue === "object" &&
    fieldValue._type === "blockContent"
  )
}

/**
 * Convert Portable Text to plain text for translation
 */
function portableTextToPlain(fieldValue: any): string {
  if (!fieldValue || !fieldValue.children) return ""

  return fieldValue.children
    .map((child: any) => {
      if (child.text) return child.text
      return ""
    })
    .join(" ")
}

/**
 * Convert plain text back to Portable Text
 */
function plainToPortableText(originalFieldValue: any, translatedText: string): any {
  // If the original was empty, return empty
  if (!originalFieldValue) return originalFieldValue

  // Replace the text content while preserving the blockContent structure
  const children = (originalFieldValue.children || []).map(
    (child: any) => {
      // Replace text child with translated text
      if (child._type === "span" && child.text) {
        return { ...child, text: translatedText }
      }
      return child
    },
  )

  return { ...originalFieldValue, children }
}

/**
 * Translate a single field value
 */
async function translateFieldValue(
  value: any,
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslateOptions,
): Promise<any> {
  if (value === null || value === undefined) return value

  // Portable Text (blockContent) fields
  if (isPortableText(value)) {
    const plainText = portableTextToPlain(value)
    if (plainText && !plainText.trim()) {
      console.log("⚠️  Field is empty, copying original")
      return value
    }

    const translatedText = await autoTranslate(plainText, targetLanguage, options)
    if (!translatedText) {
      console.error(`❌ Failed to translate Portable Text`)
      return value
    }

    console.log(`✅ Translated Portable Text field`)
    return plainToPortableText(value, translatedText)
  }

  // String fields
  if (typeof value === "string") {
    if (!value.trim()) return value

    const translatedText = await autoTranslate(value, targetLanguage, options)
    if (!translatedText) {
      console.error(`❌ Failed to translate string field: ${value}`)
      return value
    }

    console.log(`✅ Translated string field`)
    return translatedText
  }

  // Array fields (like highlightFeatures) - translate each string element
  if (Array.isArray(value)) {
    const translatedItems: any[] = []
    for (const item of value) {
      if (typeof item === "string") {
        const translated = await autoTranslate(item, targetLanguage, options)
        if (translated) {
          translatedItems.push(translated)
        } else {
          translatedItems.push(item)
        }
      } else if (typeof item === "object" && item !== null) {
        // For objects within arrays (e.g., highlightFeatures with title/description/icon)
        const translatedObj: any = {}
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === "string") {
            const translated = await autoTranslate(val, targetLanguage, options)
            translatedObj[key] = translated || val
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
 * Auto-translate text using the configured provider
 */
async function autoTranslate(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  console.log("Translating with...", options.provider)

  switch (options.provider) {
    case "ollama":
      return translateWithOllama(text, target, options)
    case "libretranslate":
      return translateWithLibreTranslate(text, target, options)
    case "huggingface":
      return translateWithHuggingFace(text, target, options)
    case "google":
    default: {
      const { translate } = await import("@vitalets/google-translate-api")
      try {
        const res = await translate(text, { to: target })
        return res.text
      } catch (err) {
        console.error("Google translate error:", err)
        return null
      }
    }
  }
}

/**
 * Translate with Ollama
 */
async function translateWithOllama(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  const prompt = `Translate the following text to ${target}. Return ONLY the translation, no explanations:\n\n${text}`

  try {
    const res = await fetch(`${options.ollamaHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`)

    const data = await res.json()
    return data.response?.trim() || null
  } catch (err) {
    console.error("Ollama translation error:", err)
    return null
  }
}

/**
 * Translate with LibreTranslate
 */
async function translateWithLibreTranslate(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  try {
    const res = await fetch(`${options.libretranslateUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: target,
        format: "text",
      }),
    })

    if (!res.ok) throw new Error(`LibreTranslate error: ${res.statusText}`)

    const data = await res.json()
    return data.translatedText || null
  } catch (err) {
    console.error("LibreTranslate error:", err)
    return null
  }
}

/**
 * Translate with Hugging Face
 */
async function translateWithHuggingFace(
  text: string,
  target: string,
  options: TranslateOptions,
): Promise<string | null> {
  if (!options.huggingfaceToken) {
    console.warn("Hugging Face token not set")
    return null
  }

  const prompt = `Translate to ${target}: "${text}"\nTranslation:`

  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${options.huggingfaceModel}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.huggingfaceToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      },
    )

    if (!res.ok) throw new Error(`HuggingFace error: ${res.statusText}`)

    const data = await res.json()
    return data[0]?.generated_text?.trim() || null
  } catch (err) {
    console.error("HuggingFace translation error:", err)
    return null
  }
}

interface DocInfo {
  _id: string
  _type: string
  slug: string | null
  language: string
  [key: string]: any
}

/**
 * Main translation function
 */
async function translateSanityAI(
  options: TranslateOptions = getOptions(),
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
      `*[_type == "$type" && language == "en" && defined(slug.current)]{
        _id,
        slug,
        _rev
      }`,
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
            `*[_type == "$type" && slug.current == $slug && language == $targetCode][0]`,
            {
              slug: enDoc.slug?.current,
              targetCode,
            },
          )

          // Build base fields (non-translatable fields to copy as-is)
          const translatableFieldSet = new Set(TRANSLATABLE_FIELDS[type] || [])
          const copyAsIsFieldSet = new Set(COPY_AS_IS_FIELDS[type] || [])

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