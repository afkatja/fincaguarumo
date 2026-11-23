import "dotenv/config"
import { translateWithOllama } from "./providers/ollama"
import { translateWithDeepL, translateWithDeepLBatch } from "./providers/deepl"
import { translateWithGoogle } from "./providers/google"
import { translateWithLibreTranslate } from "./providers/libretranslate"

export type LangRef = { code: string; title: string }

export type TranslateProvider = "google" | "ollama" | "libretranslate" | "deepl"

export interface TranslateOptions {
  provider: TranslateProvider
  ollamaHost?: string
  ollamaModel?: string
  libretranslateUrl?: string
  libretranslateApiKey?: string
  deeplAuthKey?: string
  deeplFormality?: "more" | "less" | "default"
  deeplGlossaryId?: string
  deeplTagHandling?: "html" | "xml"
  glossaryTerms?: string[]
  concurrency?: number
}

const DEFAULT_PROVIDER: TranslateProvider = "google"
export const DEFAULT_CONCURRENCY = 4

// Brand and domain terms that must never be translated. Applied identically to
// every provider: Ollama and Google via pre/post substitution below, DeepL via
// its native glossary when deeplGlossaryId is set (falling back to the same
// substitution otherwise).
export const DEFAULT_GLOSSARY_TERMS = [
  "Finca Guarumo",
  "Villa Bruno",
  "finca",
  "AirBnb",
  "Airbnb",
  "Booking.com",
  "Expedia",
  "Google Maps",
  "Apple Maps",
  "Waze",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Youtube",
  "YouTube",
]

// Placeholders and markup the MT must not alter: {name}, {count, plural, ...},
// <b>…</b>, ${var}, %s. These are left exposed to the engine so the post
// translation guard can detect mangeling and return null instead of writing a
// broken translation silently.
const PLACEHOLDER_RE = /<[^>]+>|\{[^{}]*\}|\$\{[^{}]*\}|%[a-z]/gi

export interface ProtectedText {
  text: string
  glossary: string[]
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Replace do-not-translate glossary terms with opaque tokens so no provider can
 * alter them. Placeholders are intentionally left in place so core can verify
 * they survive translation.
 */
export function protectText(
  text: string,
  glossaryTerms: string[],
): ProtectedText {
  const glossary: string[] = []
  let result = text

  const terms = [...glossaryTerms].sort((a, b) => b.length - a.length)
  if (terms.length > 0) {
    const re = new RegExp(terms.map(escapeRegExp).join("|"), "gi")
    result = result.replace(re, match => {
      glossary.push(match)
      return `__GL_${glossary.length - 1}__`
    })
  }

  return { text: result, glossary }
}

/**
 * Restore glossary tokens to their original spelling. Restores in reverse
 * order so earlier substitutions are not clobbered by later ones.
 */
export function restoreText(
  text: string,
  protectedText: ProtectedText,
): string {
  let result = text
  for (let i = protectedText.glossary.length - 1; i >= 0; i--) {
    result = result.split(`__GL_${i}__`).join(protectedText.glossary[i])
  }
  return result
}

export function extractPlaceholders(text: string): string[] {
  const matches: string[] = []
  const re = new RegExp(PLACEHOLDER_RE.source, PLACEHOLDER_RE.flags)
  let match: RegExpExecArray | null
  // reset lastIndex in case the regex is reused
  re.lastIndex = 0
  while ((match = re.exec(text))) {
    matches.push(match[0])
  }
  return matches
}

/**
 * Returns true when every placeholder/markup span in the source is still
 * present in the translation (at least as often). Used as the post-translation
 * guard: a mismatch means the MT mangled markup and the result is treated as
 * failed (null).
 */
export function placeholdersPreserved(
  source: string,
  translation: string,
): boolean {
  const sourceTokens = extractPlaceholders(source)
  if (sourceTokens.length === 0) return true

  const remaining = new Map<string, number>()
  for (const token of extractPlaceholders(translation)) {
    remaining.set(token, (remaining.get(token) ?? 0) + 1)
  }

  for (const token of sourceTokens) {
    const count = remaining.get(token) ?? 0
    if (count < 1) return false
    remaining.set(token, count - 1)
  }
  return true
}

export interface Glossary {
  terms: string[]
}

export function makeGlossary(terms?: string[]): Glossary {
  return { terms: terms ? [...terms] : [...DEFAULT_GLOSSARY_TERMS] }
}

export function getProviderName(): TranslateProvider {
  const env = process.env
  return (env.TRANSLATION_PROVIDER || DEFAULT_PROVIDER) as TranslateProvider
}

export function getOptions(): TranslateOptions {
  return {
    provider: getProviderName(),
    ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
    libretranslateUrl:
      process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate",
    libretranslateApiKey: process.env.LIBRETRANSLATE_API_KEY,
    deeplAuthKey: process.env.DEEPL_AUTH_KEY,
    deeplFormality:
      (process.env.DEEPL_FORMALITY as "more" | "less" | "default") || "default",
    deeplGlossaryId: process.env.DEEPL_GLOSSARY_ID,
    deeplTagHandling:
      (process.env.DEEPL_TAG_HANDLING as "html" | "xml") || "xml",
    glossaryTerms: process.env.TRANSLATION_GLOSSARY
      ? process.env.TRANSLATION_GLOSSARY.split(",")
          .map(t => t.trim())
          .filter(Boolean)
      : undefined,
    concurrency: process.env.TRANSLATION_CONCURRENCY
      ? Number(process.env.TRANSLATION_CONCURRENCY)
      : DEFAULT_CONCURRENCY,
  }
}

type SingleTranslate = (
  text: string,
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
) => Promise<string | null>

const PROVIDERS: Record<TranslateProvider, SingleTranslate> = {
  google: translateWithGoogle,
  ollama: translateWithOllama,
  libretranslate: translateWithLibreTranslate,
  deepl: translateWithDeepL,
}

export function getProvider(options: TranslateOptions): SingleTranslate {
  return PROVIDERS[options.provider]
}

/**
 * Translate a single string.
 *
 * Pipeline:
 *  1. substitute do-not-translate glossary terms with tokens
 *  2. translate (placeholders/markup exposed to the engine)
 *  3. restore glossary terms
 *  4. post-translation placeholder guard -> null on mismatch
 */
export async function autoTranslate(
  text: string,
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
): Promise<string | null> {
  if (text === "") return ""

  const glossary = makeGlossary(options.glossaryTerms)
  // DeepL has native glossary support; let it handle terms when a glossaryId
  // is configured, otherwise protect terms via substitution like the other
  // providers.
  const termsToProtect =
    options.provider === "deepl" && options.deeplGlossaryId
      ? []
      : glossary.terms

  const protectedText = protectText(text, termsToProtect)
  const translated = await getProvider(options)(
    protectedText.text,
    from,
    to,
    options,
  )

  if (translated === null || translated === "") return null

  const restored = restoreText(translated, protectedText)
  if (!placeholdersPreserved(text, restored)) {
    console.error(
      `Placeholder/markup guard failed for text: "${text.slice(0, 60)}..."`,
    )
    return null
  }

  return restored
}

/**
 * Small in-process concurrency limiter (p-limit equivalent) so a full sync does
 * not translate one string per request sequentially.
 */
function pLimit<T>(concurrency: number) {
  let running = 0
  const queue: Array<{
    fn: () => Promise<T>
    resolve: (value: T) => void
    reject: (reason: unknown) => void
  }> = []

  const enqueue = (fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      processQueue()
    })

  function processQueue(): void {
    while (running < concurrency && queue.length > 0) {
      const item = queue.shift()!
      running += 1
      item
        .fn()
        .then(item.resolve, item.reject)
        .finally(() => {
          running -= 1
          processQueue()
        })
    }
  }

  return enqueue
}

/**
 * Translate multiple strings with bounded concurrency. DeepL accepts arrays
 * and is batched into a single request; every other provider is called through
 * the concurrency limiter. Output order matches input order.
 */
export async function translateBatch(
  texts: string[],
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
): Promise<(string | null)[]> {
  if (texts.length === 0) return []

  const glossary = makeGlossary(options.glossaryTerms)
  const termsToProtect =
    options.provider === "deepl" && options.deeplGlossaryId
      ? []
      : glossary.terms

  const protectedTexts = texts.map(t =>
    t === "" ? { text: "", glossary: [] } : protectText(t, termsToProtect),
  )
  const toTranslate = protectedTexts.map(p => p.text)

  let translated: (string | null)[]
  if (options.provider === "deepl") {
    translated = await translateWithDeepLBatch(toTranslate, from, to, options)
  } else {
    const limit = pLimit<string | null>(
      options.concurrency ?? DEFAULT_CONCURRENCY,
    )
    translated = await Promise.all(
      toTranslate.map(t =>
        limit(() => getProvider(options)(t, from, to, options)),
      ),
    )
  }

  return translated.map((result, index) => {
    if (result === null || result === "") return null
    const restored = restoreText(result, protectedTexts[index])
    if (!placeholdersPreserved(texts[index], restored)) {
      console.error(
        `Placeholder/markup guard failed for text: "${texts[index].slice(0, 60)}..."`,
      )
      return null
    }
    return restored
  })
}
