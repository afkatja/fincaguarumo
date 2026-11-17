import { createClient } from "next-sanity"
import { NextResponse } from "next/server"
import { locales } from "../../../config"
import { getCopyAsIsFields } from "../../../config/translatable-fields"

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: process.env.SANITY_STUDIO_API_VERSION,
})

function isFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

type CopyResult = {
  language: string
  docId?: string
  success?: boolean
  updated?: boolean
  skipped?: boolean
  reason?: string
  fieldsCopied?: string[]
  [key: string]: unknown
}

type CopyError = {
  language: string
  error: string
}

export async function POST(request: Request) {
  const {
    docId,
    docType,
    sourceLanguage = "en",
    targetLanguages = locales.filter(lang => lang !== sourceLanguage),
  }: {
    docId: string
    docType: string
    sourceLanguage?: string
    targetLanguages?: string[]
  } = await request.json()

  try {
    if (!docId || !docType) {
      return NextResponse.json(
        { error: "Missing required fields: docId, docType" },
        { status: 400 },
      )
    }

    const uniqueTargetLanguages = [...new Set(targetLanguages)].filter(
      lang => lang !== sourceLanguage,
    )

    if (uniqueTargetLanguages.length === 0) {
      return NextResponse.json(
        { error: "No valid target languages specified" },
        { status: 400 },
      )
    }

    const copyAsIsFields = getCopyAsIsFields(docType)
    if (!copyAsIsFields || copyAsIsFields.length === 0) {
      return NextResponse.json(
        {
          error: `No copy-as-is fields configured for document type: ${docType}`,
        },
        { status: 400 },
      )
    }

    const sourceDoc = await client.fetch(
      `*[_type == $docType && _id == $docId][0]`,
      { docId, docType },
    )

    if (!sourceDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const sourceSlug = sourceDoc.slug?.current

    const results: CopyResult[] = []
    const errors: CopyError[] = []

    for (const targetLang of uniqueTargetLanguages) {
      try {
        const existingDoc = sourceSlug
          ? await client.fetch(
              `*[_type == $docType && slug.current == $slug && language == $targetLang][0]`,
              { docType, slug: sourceSlug, targetLang },
            )
          : await client.fetch(
              `*[_type == $docType && language == $targetLang][0]`,
              { docType, targetLang },
            )

        const fieldsToCopy: { [key: string]: unknown } = {}
        for (const field of copyAsIsFields) {
          const sourceValue = sourceDoc[field]
          if (sourceValue === undefined || sourceValue === null) continue
          const targetValue = existingDoc ? existingDoc[field] : undefined
          if (isFieldEmpty(targetValue)) {
            fieldsToCopy[field] = sourceValue
          }
        }

        if (Object.keys(fieldsToCopy).length === 0) {
          results.push({
            language: targetLang,
            skipped: true,
            reason: "All copy-as-is fields already filled",
            docId: existingDoc?._id,
          })
          continue
        }

        if (existingDoc) {
          const updatedDoc = await client
            .patch(existingDoc._id)
            .set({ ...fieldsToCopy })
            .commit()

          results.push({
            language: targetLang,
            doc: updatedDoc,
            success: true,
            updated: true,
            fieldsCopied: Object.keys(fieldsToCopy),
          })
        } else {
          const createdDoc = await client.create({
            _type: docType,
            language: targetLang,
            ...(sourceSlug
              ? { slug: { _type: "slug", current: sourceSlug } }
              : {}),
            ...fieldsToCopy,
          })

          results.push({
            language: targetLang,
            doc: createdDoc,
            success: true,
            fieldsCopied: Object.keys(fieldsToCopy),
          })
        }
        console.log(
          `Fields copied for ${targetLang}: `,
          Object.keys(fieldsToCopy),
        )
      } catch (error) {
        errors.push({
          language: targetLang,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json(
      {
        success: errors.length === 0,
        copied: results.filter((r: CopyResult) => r.success).length,
        skipped: results.filter((r: CopyResult) => r.skipped).length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Copy fields error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Copy fields failed" },
      { status: 500 },
    )
  }
}
