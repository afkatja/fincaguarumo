import type { LangRef } from "../core.js"

/**
 * Translate a single string with the free Google Translate API.
 *
 * An explicit source language is passed to every request. Placeholders and
 * brand terms are guarded by core.ts; a failed placeholder guard yields null.
 */
export async function translateWithGoogle(
  text: string,
  from: LangRef,
  to: LangRef,
): Promise<string | null> {
  // Dynamic import keeps the optional dependency out of the browser bundle.
  const { translate } = await import("@vitalets/google-translate-api")

  try {
    const res = await translate(text, { from: from.code, to: to.code })
    return res.text
  } catch (err) {
    console.error("Google translate error:", err)
    return null
  }
}
