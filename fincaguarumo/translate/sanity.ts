import type { PortableTextBlock } from "@portabletext/types"
import { autoTranslate, type LangRef, type TranslateOptions } from "./core"
import { getTranslatableFields } from "../src/config/translatable-fields"
import {
  isPortableText,
  plainToPortableText,
  portableTextToPlain,
} from "../src/sanity/lib/portableTextHelper"

export interface SanityTranslateOptions {
  sourceLang: LangRef
  targetLang: LangRef
  options: TranslateOptions
}

/**
 * Walk a Sanity document and translate every translatable field (per the shared
 * field registry in src/config/translatable-fields.js), calling core's
 * autoTranslate for each string so placeholder/glossary guards apply
 * identically to the JSON sync path.
 *
 * Portable Text fields are flattened to plain text, translated, and written
 * back into the original block structure. Fields that fail translation (null)
 * are left unchanged rather than silently overwriting good content.
 */
export async function translateDocumentFields(
  doc: Record<string, unknown>,
  docType: string,
  { sourceLang, targetLang, options }: SanityTranslateOptions,
): Promise<Record<string, unknown>> {
  const fields = getTranslatableFields(docType)
  const result = { ...doc }

  for (const field of fields) {
    const value = doc[field]
    if (value == null) continue

    if (isPortableText(value)) {
      const plainText = portableTextToPlain(value as PortableTextBlock[])
      if (!plainText.trim()) continue

      const translated = await autoTranslate(
        plainText,
        sourceLang,
        targetLang,
        options,
      )
      if (translated) {
        result[field] = plainToPortableText(
          value as PortableTextBlock[],
          translated,
        )
      }
      continue
    }

    if (typeof value === "string") {
      const translated = await autoTranslate(
        value,
        sourceLang,
        targetLang,
        options,
      )
      if (translated) {
        result[field] = translated
      }
      continue
    }

    if (Array.isArray(value)) {
      result[field] = await Promise.all(
        value.map(async element => {
          if (typeof element === "string") {
            const translated = await autoTranslate(
              element,
              sourceLang,
              targetLang,
              options,
            )
            return translated ?? element
          }
          if (isPortableText(element)) {
            const plainText = portableTextToPlain(element)
            if (!plainText.trim()) return element
            const translated = await autoTranslate(
              plainText,
              sourceLang,
              targetLang,
              options,
            )
            return translated
              ? plainToPortableText(element, translated)
              : element
          }
          return element
        }),
      )
      continue
    }
  }

  return result
}
