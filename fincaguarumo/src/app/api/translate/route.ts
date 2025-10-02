import { createClient } from "next-sanity"
import { NextResponse } from "next/server"
import { locales } from "../../../config"
import translateText from "../../../sanity/lib/translateText"
import {
  isPortableText,
  plainToPortableText,
  portableTextToPlain,
} from "../../../sanity/lib/portableTextHelper"

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: process.env.SANITY_STUDIO_API_VERSION,
})

const TRANSLATABLE_FIELDS = {
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
}

export async function POST(request: Request) {
  const {
    docId,
    docType,
    sourceLanguage = "en",
    targetLanguages = locales.filter(lang => lang !== sourceLanguage),
  }: {
    docId: string
    docType: keyof typeof TRANSLATABLE_FIELDS
    sourceLanguage?: string
    targetLanguages?: string[]
  } = await request.json()

  try {
    // Validate input
    if (!docId || !docType) {
      return NextResponse.json(
        { error: "Missing required fields: docId, docType" },
        { status: 400 }
      )
    }

    // Remove duplicates and filter out source language
    const uniqueTargetLanguages = [...new Set(targetLanguages)].filter(
      lang => lang !== sourceLanguage
    )

    if (uniqueTargetLanguages.length === 0) {
      return NextResponse.json(
        { error: "No valid target languages specified" },
        { status: 400 }
      )
    }

    console.log("🌍 Translation request:", {
      docId,
      docType,
      sourceLanguage,
      targetLanguages: uniqueTargetLanguages,
    })

    // Get source document with slug
    const sourceDoc = await client.fetch(
      `*[_type == $docType && _id == $docId][0]`,
      { docId, docType }
    )

    if (!sourceDoc) {
      console.error("Document not found:", { docId, docType })
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const fieldsToTranslate = TRANSLATABLE_FIELDS[docType]
    if (!fieldsToTranslate) {
      console.error("No translatable fields configured for type:", docType)
      return NextResponse.json(
        {
          error: `Translation not configured for document type: ${docType}`,
        },
        { status: 400 }
      )
    }

    const sourceSlug = sourceDoc.slug?.current
    if (!sourceSlug) {
      return NextResponse.json(
        { error: "Source document must have a slug" },
        { status: 400 }
      )
    }

    console.log("🔍 Source document:", {
      id: docId,
      slug: sourceSlug,
      language: sourceLanguage,
    })

    const results = []
    const errors = []
    const createdDocIds = [docId] // Track all document IDs for translation.metadata

    for (const targetLang of uniqueTargetLanguages) {
      try {
        // Check if translation already exists by slug + language
        const existingDoc = await client.fetch(
          `*[_type == $docType && slug.current == $slug && language == $targetLang][0]`,
          { docType, slug: sourceSlug, targetLang }
        )

        // Get base fields (non-translatable fields)
        const baseFields = Object.fromEntries(
          Object.entries(sourceDoc).filter(([key]) => {
            return (
              !key.startsWith("_") &&
              key !== "language" &&
              key !== "slug" &&
              !fieldsToTranslate.includes(key)
            )
          })
        )

        console.log(`🔄 Translating to ${targetLang}...`)

        // Translate fields
        const translatedFields: { [key: string]: any } = {}
        const fieldsToUpdate = existingDoc
          ? fieldsToTranslate.filter(
              field =>
                !existingDoc[field] ||
                (Array.isArray(existingDoc[field]) &&
                  existingDoc[field].length === 0)
            )
          : fieldsToTranslate

        if (existingDoc && fieldsToUpdate.length === 0) {
          console.log(
            `⚠️  Translation for ${targetLang} already exists and is complete`
          )
          results.push({
            language: targetLang,
            skipped: true,
            reason: "Translation already exists",
            docId: existingDoc._id,
          })
          createdDocIds.push(existingDoc._id)
          continue
        }

        // Translate required fields
        for (const field of fieldsToUpdate) {
          if (sourceDoc[field]) {
            try {
              const fieldValue = sourceDoc[field]

              if (isPortableText(fieldValue)) {
                console.log(`📝 Translating Portable Text field: ${field}`)
                const plainText = portableTextToPlain(fieldValue)

                if (!plainText.trim()) {
                  console.log(`⚠️  ${field} is empty, copying original`)
                  translatedFields[field] = fieldValue
                  continue
                }

                const translatedText = await translateText(
                  plainText,
                  sourceLanguage,
                  targetLang
                )
                translatedFields[field] = plainToPortableText(
                  fieldValue,
                  translatedText
                )
              } else if (typeof fieldValue === "string") {
                const translatedText = await translateText(
                  fieldValue,
                  sourceLanguage,
                  targetLang
                )
                translatedFields[field] = translatedText
              } else {
                translatedFields[field] = fieldValue
              }
              console.log(`✅ Translated ${field}`)
            } catch (error) {
              console.error(`❌ Failed to translate ${field}:`, error)
              throw new Error(`Failed to translate field: ${field}`)
            }
          }
        }

        if (existingDoc) {
          console.log(
            `🔄 Updating translation for ${targetLang} with fields: ${Object.keys(translatedFields).join(", ")}`
          )

          const updatedDoc = await client
            .patch(existingDoc._id)
            .set({
              ...translatedFields,
              _type: docType,
              language: targetLang,
              slug: {
                _type: "slug",
                current: sourceSlug,
              },
            })
            .commit()

          console.log(`✅ Updated ${updatedDoc._id}`)
          createdDocIds.push(updatedDoc._id)
          results.push({
            language: targetLang,
            doc: updatedDoc,
            success: true,
            updated: true,
          })
        } else {
          console.log(`📝 Creating new translation for ${targetLang}`)
          const translatedDoc = await client.create({
            _type: docType,
            language: targetLang,
            slug: {
              _type: "slug",
              current: sourceSlug,
            },
            ...baseFields,
            ...translatedFields,
          })

          console.log(`✅ Created ${translatedDoc._id}`)
          createdDocIds.push(translatedDoc._id)
          results.push({
            language: targetLang,
            doc: translatedDoc,
            success: true,
          })
        }
      } catch (error) {
        console.error(`❌ Failed to translate to ${targetLang}:`, error)
        errors.push({
          language: targetLang,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Update or create translation.metadata document
    if (createdDocIds.length > 1) {
      try {
        console.log("🔗 Updating translation metadata...")

        // Check if translation.metadata already exists for this document
        const existingMetadata = await client.fetch(
          `*[_type == "translation.metadata" && $docId in translations[].value._ref][0]`,
          { docId }
        )

        const translationRefs = createdDocIds.map(id => ({
          _key: id,
          _type: "reference",
          _ref: id,
        }))

        if (existingMetadata) {
          // Update existing metadata
          await client
            .patch(existingMetadata._id)
            .set({ translations: translationRefs })
            .commit()
          console.log(
            `✅ Updated translation.metadata: ${existingMetadata._id}`
          )
        } else {
          // Create new metadata
          const metadata = await client.create({
            _type: "translation.metadata",
            translations: translationRefs,
          })
          console.log(`✅ Created translation.metadata: ${metadata._id}`)
        }
      } catch (error) {
        console.error("⚠️  Failed to update translation metadata:", error)
        // Don't fail the whole operation if metadata update fails
      }
    }

    return NextResponse.json(
      {
        success: errors.length === 0,
        translations: results,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Translation failed",
      },
      { status: 500 }
    )
  }
}
