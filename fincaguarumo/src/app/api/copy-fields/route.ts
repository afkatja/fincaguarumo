import { createClient } from "next-sanity"
import { NextResponse } from "next/server"
import { locales } from "../../../config"
import {
  FIELDS_CONFIG,
  getTranslatableFields,
  getCopyAsIsFields,
} from "../../../config/translatable-fields"

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

// Fields whose values contain references to translatable Sanity documents.
// When copying to a target language, resolve source-language references to
// their target-language equivalents by matching slugs, so the translated
// document references the correct language variant instead of the
// source-language document.
const CROSS_LANGUAGE_REF_FIELDS: Record<string, string> = {
  activityBlocks: "activityBlock",
  whyChooseVillaBruno: "whyChooseVillaBruno",
}

/**
 * Resolves cross-language document references by matching slugs.
 * Replaces each source-language `_ref` with the `_ref` of the
 * target-language document that shares the same slug.
 */
async function resolveCrossLanguageReferences(
  value: unknown,
  refType: string,
  targetLang: string,
): Promise<unknown> {
  const refs: Array<{ _ref: string }> = Array.isArray(value)
    ? value
    : [value]
  const refIds = refs.map((r) => r._ref).filter(Boolean)

  if (refIds.length === 0) return value

  const sourceDocs: Array<{ _id: string; slug?: { current?: string } }> =
    await client.fetch(`*[_id in $ids]{ _id, slug }`, { ids: refIds })

  const idToSlug = new Map<string, string | undefined>()
  for (const doc of sourceDocs) {
    idToSlug.set(doc._id, doc.slug?.current)
  }

  const slugs = [...idToSlug.values()].filter(
    (s): s is string => s !== undefined,
  )

  if (slugs.length === 0) return value

  const targetDocs: Array<{ _id: string; slug: { current: string } }> =
    await client.fetch(
      `*[_type == $refType && language == $lang && slug.current in $slugs]{ _id, slug }`,
      { refType, lang: targetLang, slugs },
    )

  const slugToId = new Map<string, string>()
  for (const doc of targetDocs) {
    slugToId.set(doc.slug.current, doc._id)
  }

  const resolved = refs.map((r) => {
    const slug = idToSlug.get(r._ref)
    const targetId = slug ? slugToId.get(slug) : undefined
    return targetId ? { _type: "reference", _ref: targetId } : r
  })

  return Array.isArray(value) ? resolved : resolved[0]
}

export async function POST(request: Request) {
  let body: {
    docId: string
    docType: string
    sourceLanguage?: string
    targetLanguages?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const {
    docId,
    docType,
    sourceLanguage = "en",
    targetLanguages,
  } = body

  try {
    if (!docId || !docType) {
      return NextResponse.json(
        { error: "Missing required fields: docId, docType" },
        { status: 400 },
      )
    }

    // Validate targetLanguages: an array of valid string locale identifiers
    // drawn from the configured locales. Reject strings and arrays containing
    // unsupported locales.
    const resolvedTargetLanguages: string[] = []
    if (targetLanguages === undefined) {
      resolvedTargetLanguages.push(
        ...locales.filter(lang => lang !== sourceLanguage),
      )
    } else {
      if (!Array.isArray(targetLanguages)) {
        return NextResponse.json(
          { error: "targetLanguages must be an array of locale identifiers" },
          { status: 400 },
        )
      }
      for (const lang of targetLanguages) {
        if (typeof lang !== "string") {
          return NextResponse.json(
            { error: "targetLanguages must be an array of string locale identifiers" },
            { status: 400 },
          )
        }
        if (!locales.includes(lang)) {
          return NextResponse.json(
            { error: `Unsupported locale: ${lang}` },
            { status: 400 },
          )
        }
        if (lang !== sourceLanguage) {
          resolvedTargetLanguages.push(lang)
        }
      }
    }

    const uniqueTargetLanguages = [...new Set(resolvedTargetLanguages)]

    if (uniqueTargetLanguages.length === 0) {
      return NextResponse.json(
        { error: "No valid target languages specified" },
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

    // Build the copy-as-is field set: configured copy-as-is fields plus any
    // source document field not listed in FIELDS_CONFIG (default copy-as-is),
    // excluding translatable fields, underscore-prefixed fields, language and
    // slug to match translate behaviour.
    const translatableSet = new Set(getTranslatableFields(docType))
    const configuredFields = (
      FIELDS_CONFIG as unknown as Record<string, Record<string, unknown>>
    )[docType]
    const copyFieldsSet = new Set<string>(getCopyAsIsFields(docType))
    for (const key of Object.keys(sourceDoc)) {
      if (key.startsWith("_") || key === "language" || key === "slug") continue
      if (translatableSet.has(key)) continue
      if (configuredFields && key in configuredFields) continue
      copyFieldsSet.add(key)
    }
    const copyFields = [...copyFieldsSet]

    if (copyFields.length === 0) {
      return NextResponse.json(
        {
          error: `No copy-as-is fields configured for document type: ${docType}`,
        },
        { status: 400 },
      )
    }

    const results: CopyResult[] = []
    const errors: CopyError[] = []

    for (const targetLang of uniqueTargetLanguages) {
      try {
        const existingDoc = sourceSlug
          ? await client.fetch(
              `*[_type == $docType && slug.current == $slug && language == $targetLang][0]`,
              { docType, slug: sourceSlug, targetLang },
            )
          : await (async () => {
              const metadata: Record<string, unknown> | null =
                await client.fetch(
                  `*[_type == "translation.metadata" && $docId in translations[].value._ref][0]`,
                  { docId },
                )
              const linkedIds = (metadata?.translations as unknown[])
                ?.map(
                  (r: unknown) =>
                    (r as { value?: { _ref?: string } })?.value?._ref,
                )
                .filter(Boolean) ?? []
              return linkedIds.length > 0
                ? await client.fetch(
                    `*[_type == $docType && _id in $ids && language == $targetLang][0]`,
                    { ids: linkedIds, targetLang },
                  )
                : null
            })()

        const fieldsToCopy: { [key: string]: unknown } = {}
        for (const field of copyFields) {
          const sourceValue = sourceDoc[field]
          if (sourceValue === undefined || sourceValue === null) continue
          const targetValue = existingDoc ? existingDoc[field] : undefined
          if (!isFieldEmpty(targetValue)) continue

          let resolvedValue = sourceValue
          const refType = CROSS_LANGUAGE_REF_FIELDS[field]
          if (refType) {
            resolvedValue = await resolveCrossLanguageReferences(
              resolvedValue,
              refType,
              targetLang,
            )
          }

          fieldsToCopy[field] = resolvedValue
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
