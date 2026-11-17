import { TRANSLATABLE_FIELDS } from "../config/translatable-fields"
import { locales } from "../config"

export type TranslatableDocType = keyof typeof TRANSLATABLE_FIELDS
export type Locale = (typeof locales)[number]

export interface TranslateRequest {
  docId: string
  docType: TranslatableDocType
  sourceLanguage?: Locale
  targetLanguages?: Locale[]
  provider?: string // Optional provider override (google-cloud, google-free, ollama, libretranslate, huggingface)
}

export interface TranslateResult {
  language: Locale
  docId?: string
  success?: boolean
  updated?: boolean
  skipped?: boolean
  reason?: string
  doc?: SanityDocument
}

export interface TranslateError {
  language: Locale
  error: string
}

export interface TranslateResponse {
  success: boolean
  translations: TranslateResult[]
  errors?: TranslateError[]
}

export interface SanityDocument {
  _id: string
  _type: string
  _rev: string
  _createdAt: string
  _updatedAt: string
  [key: string]: any
}