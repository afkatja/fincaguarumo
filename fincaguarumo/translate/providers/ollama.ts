import type { LangRef, TranslateOptions } from "../core.js"

export interface OllamaOptions {
  host: string
  model: string
}

/**
 * Translate a single string with Ollama.
 *
 * The target language is passed as its human name (e.g. "Russian") because
 * small Ollama models handle codes like "ru" unreliably. Placeholders and HTML
 * tags are explicitly instructed to stay unchanged; core.ts also runs a
 * post-translation placeholder guard that returns null on mismatch.
 */
export async function translateWithOllama(
  text: string,
  from: LangRef,
  to: LangRef,
  options: TranslateOptions,
): Promise<string | null> {
  const prompt = `Translate the following text from ${from.title} to ${to.title}. Keep {placeholders} and HTML tags unchanged. Return ONLY the translation, no explanations:\n\n${text}`

  const ollamaOptions: OllamaOptions = {
    host: options.ollamaHost || "http://localhost:11434",
    model: options.ollamaModel || "llama3.2",
  }

  try {
    const res = await fetch(`${ollamaOptions.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaOptions.model,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`)

    const data = await res.json()
    return data.response?.trim() || null
  } catch (err) {
    console.error("Ollama translation error:", err)
    return null
  }
}
