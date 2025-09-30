import { createClient } from "next-sanity"
import { NextResponse } from "next/server"
import { locales } from "../../../config"
import translateText from "../../../sanity/lib/translateText"
import tr from "zod/v4/locales/tr.cjs"

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
    // Get source document
    const sourceDoc = await client.fetch(
      `*[_type == $docType && _id == $docId][0]`,
      { docId, docType }
    )

    if (!sourceDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const fieldsToTranslate = TRANSLATABLE_FIELDS[docType]
    if (!fieldsToTranslate) {
      return NextResponse.json(
        {
          error: `Translation not configured for document type: ${docType}`,
        },
        { status: 400 }
      )
    }

    const results = []

    for (const targetLang of targetLanguages) {
      const translatedFields: { [key: string]: string } = {}

      // Translate each field
      for (const field of fieldsToTranslate) {
        if (sourceDoc[field]) {
          const translatedText = await translateText(
            sourceDoc[field],
            sourceLanguage,
            targetLang
          )
          translatedFields[field] = translatedText
        }
      }

      const baseDocId = docId.replace("drafts.", "").split(".")[0] // Remove language suffix if exists
      const translatedDocId = `${baseDocId}_${targetLang}` // Use underscore instead of dot

      console.log(`💾 Creating translated document: ${translatedDocId}`)
      const baseFields = Object.fromEntries(
        Object.entries(sourceDoc).filter(([key]) => {
          // Exclude system fields, i18n fields, and translatable fields
          return (
            !key.startsWith("_") &&
            !key.startsWith("__i18n") &&
            key !== "language" &&
            !fieldsToTranslate.includes(key)
          )
        })
      )
      const translatedDoc = await client.create({
        _id: translatedDocId,
        _type: docType,
        __i18n_lang: targetLang,
        language: targetLang,
        __i18n_base: baseDocId,
        ...baseFields, // Copy all original fields
        ...translatedFields, // Override with translations
        _createdAt: undefined, // Let Sanity set new timestamps
        _updatedAt: undefined,
        _rev: undefined,
      })

      results.push({ language: targetLang, doc: translatedDoc })
    }

    return NextResponse.json(
      { success: true, translations: results },
      { status: 200 }
    )
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error }, { status: 500 })
  }
}
