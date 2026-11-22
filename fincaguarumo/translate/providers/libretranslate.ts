import type { LangRef, TranslateOptions } from "../core.js"

export interface LibreTranslateOptions {
  url: string
  apiKey?: string
}

/**
 * Translate a single string with LibreTranslate.
 *
 * LibreTranslate previously hardcoded source: "en". An explicit source
 * language is now passed to every request.
 */
export async function translateWithLibreTranslate(
  text: string,
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
): Promise<string | null> {
  const libreOptions: LibreTranslateOptions = {
    url: options.libretranslateUrl || "https://libretranslate.com/translate",
    apiKey: options.libretranslateApiKey,
  }

  const body: Record<string, unknown> = {
    q: text,
    source: from.code,
    target: to.code,
    format: "text",
  }
  if (libreOptions.apiKey) {
    body.api_key = libreOptions.apiKey
  }

  try {
    const res = await fetch(libreOptions.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`LibreTranslate error: ${res.statusText}`)

    const data = await res.json()
    return data.translatedText || null
  } catch (err) {
    console.error("LibreTranslate error:", err)
    return null
  }
}
