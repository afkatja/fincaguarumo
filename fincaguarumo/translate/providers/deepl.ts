import * as deepl from "deepl-node"
import type { LangRef, TranslateOptions } from "../core.js"

let deepLClient: deepl.DeepLClient | null = null

export interface DeepLOptions {
  authKey: string
  formality?: "more" | "less" | "default"
  glossaryId?: string
  tagHandling?: "html" | "xml"
}

function getClient(authKey: string): deepl.DeepLClient {
  if (!deepLClient) {
    deepLClient = new deepl.DeepLClient(authKey)
  }
  return deepLClient
}

function buildTranslateOptions(options: DeepLOptions): deepl.TranslateTextOptions {
  const translateOptions: deepl.TranslateTextOptions = {}
  if (options.formality && options.formality !== "default") {
    translateOptions.formality = options.formality
  }
  if (options.glossaryId) {
    translateOptions.glossaryIds = [options.glossaryId]
  }
  translateOptions.tagHandling = options.tagHandling ?? "xml"
  return translateOptions
}

/**
 * Translate a single string with DeepL.
 *
 * The DeepLClient is created once and reused across calls. An explicit source
 * language is passed to every request. A native DeepL glossary is used when
 * `deeplGlossaryId` is configured.
 */
export async function translateWithDeepL(
  text: string,
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
): Promise<string | null> {
  const deepLOptions: DeepLOptions = {
    authKey: options.deeplAuthKey || "",
    formality: options.deeplFormality,
    glossaryId: options.deeplGlossaryId,
    tagHandling: options.deeplTagHandling,
  }

  if (!deepLOptions.authKey) {
    console.warn("DeepL auth key not set")
    return null
  }

  try {
    const result = await getClient(deepLOptions.authKey).translateText(
      text,
      from.code.toUpperCase(),
      to.code.toUpperCase(),
      buildTranslateOptions(deepLOptions),
    )
    return (result as deepl.TextResult).text
  } catch (err) {
    console.error("DeepL translation error:", err)
    return null
  }
}

/**
 * Translate an array of strings with DeepL in a single request.
 *
 * Results are returned in the same order as the input. A batch failure yields
 * null for every entry so the caller can decide per-string handling.
 */
export async function translateWithDeepLBatch(
  texts: string[],
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
): Promise<(string | null)[]> {
  const deepLOptions: DeepLOptions = {
    authKey: options.deeplAuthKey || "",
    formality: options.deeplFormality,
    glossaryId: options.deeplGlossaryId,
    tagHandling: options.deeplTagHandling,
  }

  if (!deepLOptions.authKey || texts.length === 0) {
    return texts.map(() => null)
  }

  try {
    const result = await getClient(deepLOptions.authKey).translateText(
      texts,
      from.code.toUpperCase(),
      to.code.toUpperCase(),
      buildTranslateOptions(deepLOptions),
    )
    const results = Array.isArray(result) ? result : [result]
    return results.map((r) => (r as deepl.TextResult).text)
  } catch (err) {
    console.error("DeepL batch translation error:", err)
    return texts.map(() => null)
  }
}
