import "dotenv/config"
import * as deepl from "deepl-node"

export type TranslationProvider =
  | "google-cloud"
  | "google-free"
  | "ollama"
  | "libretranslate"
  | "huggingface"
  | "deepl"

export interface TranslationOptions {
  provider: TranslationProvider
  googleCloudApiKey?: string
  ollamaHost?: string
  ollamaModel?: string
  libretranslateUrl?: string
  huggingfaceToken?: string
  huggingfaceModel?: string
  deeplAuthKey?: string
  deeplFormality?: "more" | "less" | "default"
  maxRetries?: number
  baseDelayMs?: number
}

export interface TranslationResult {
  translatedText: string
  provider: TranslationProvider
}

export function getDefaultOptions(): TranslationOptions {
  const provider =
    (process.env.TRANSLATION_PROVIDER as TranslationProvider) || "google-cloud"

  const options: TranslationOptions = {
    provider,
    googleCloudApiKey:
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY
        : process.env.GOOGLE_CLOUD_API_KEY_TEST,
    ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
    libretranslateUrl:
      process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate",
    huggingfaceToken: process.env.HUGGINGFACE_TOKEN,
    huggingfaceModel:
      process.env.HUGGINGFACE_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct",
    deeplAuthKey: process.env.DEEPL_AUTH_KEY,
    deeplFormality:
      (process.env.DEEPL_FORMALITY as "more" | "less" | "default") || "default",
    maxRetries: 3,
    baseDelayMs: 1000,
  }

  // Validate required env vars per provider
  validateProviderOptions(options)

  return options
}

function validateProviderOptions(options: TranslationOptions): void {
  switch (options.provider) {
    case "google-cloud": {
      if (!options.googleCloudApiKey) {
        throw new Error(
          "Google Cloud Translate API key not configured. Set NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY (production) or GOOGLE_CLOUD_API_KEY_TEST (development).",
        )
      }
      break
    }
    case "google-free": {
      // No required env vars - uses @vitalets/google-translate-api (unofficial free API)
      break
    }
    case "ollama": {
      if (!options.ollamaHost) {
        throw new Error(
          "Ollama host not configured. Set OLLAMA_HOST (default: http://localhost:11434)",
        )
      }
      if (!options.ollamaModel) {
        throw new Error(
          "Ollama model not configured. Set OLLAMA_MODEL (default: llama3.2)",
        )
      }
      break
    }
    case "libretranslate": {
      if (!options.libretranslateUrl) {
        throw new Error(
          "LibreTranslate URL not configured. Set LIBRETRANSLATE_URL (default: https://libretranslate.com/translate)",
        )
      }
      break
    }
    case "huggingface": {
      if (!options.huggingfaceToken) {
        throw new Error(
          "Hugging Face token not configured. Set HUGGINGFACE_TOKEN",
        )
      }
      if (!options.huggingfaceModel) {
        throw new Error(
          "Hugging Face model not configured. Set HUGGINGFACE_MODEL (default: meta-llama/Meta-Llama-3.1-8B-Instruct)",
        )
      }
      break
    }
    case "deepl": {
      if (!options.deeplAuthKey) {
        throw new Error("DeepL auth key not configured. Set DEEPL_AUTH_KEY")
      }
      break
    }
    default: {
      const _exhaustive: never = options.provider
      throw new Error(`Unknown translation provider: ${_exhaustive}`)
    }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number },
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < options.maxRetries) {
        const delay = options.baseDelayMs * Math.pow(2, attempt)
        console.error(
          `⚠️  Translation attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`,
        )
        await sleep(delay)
      }
    }
  }

  throw lastError
}

async function translateWithGoogleCloud(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text",
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `Google Cloud Translate API error: ${error.error?.message || response.statusText}`,
    )
  }

  const data = await response.json()
  return data.data.translations[0].translatedText
}

async function translateWithGoogleFree(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const { translate } = await import("@vitalets/google-translate-api")
  const result = await translate(text, { from: sourceLang, to: targetLang })
  return result.text
}

async function translateWithOllama(
  text: string,
  targetLang: string,
  options: TranslationOptions,
): Promise<string> {
  const prompt = `Translate the following text to ${targetLang}. Return ONLY the translation, no explanations:\n\n${text}`

  const response = await fetch(`${options.ollamaHost}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.ollamaModel,
      prompt,
      stream: false,
      options: { temperature: 0.1 },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.response?.trim() || ""
}

async function translateWithLibreTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  options: TranslationOptions,
): Promise<string> {
  const response = await fetch(options.libretranslateUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text",
    }),
  })

  if (!response.ok) {
    throw new Error(`LibreTranslate error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.translatedText || ""
}

async function translateWithHuggingFace(
  text: string,
  targetLang: string,
  options: TranslationOptions,
): Promise<string> {
  if (!options.huggingfaceToken) {
    throw new Error("Hugging Face token not configured")
  }

  const prompt = `Translate to ${targetLang}: "${text}"\nTranslation:`

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${options.huggingfaceModel}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.huggingfaceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.1,
          return_full_text: false,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`HuggingFace error: ${response.statusText}`)
  }

  const data = await response.json()
  return data[0]?.generated_text?.trim() || ""
}

async function translateWithDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  options: TranslationOptions,
): Promise<string> {
  if (!options.deeplAuthKey) {
    throw new Error("DeepL auth key not configured")
  }

  const translator = new deepl.DeepLClient(options.deeplAuthKey)

  // Map language codes to DeepL format (DeepL uses uppercase for target languages)
  const deeplTargetLang = targetLang.toUpperCase()
  const deeplSourceLang =
    sourceLang === "auto" ? null : sourceLang.toUpperCase()

  const translateOptions: deepl.TranslateTextOptions = {}

  if (options.deeplFormality && options.deeplFormality !== "default") {
    translateOptions.formality = options.deeplFormality
  }

  let result: deepl.TextResult
  try {
    result = await translator.translateText(
      text,
      deeplSourceLang,
      deeplTargetLang,
      translateOptions,
    )
  } catch (error) {
    console.error("❌ [DeepL] translateText API call failed", {
      sourceLang,
      targetLang,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }

  return result.text
}

async function translateWithProvider(
  text: string,
  sourceLang: string,
  targetLang: string,
  options: TranslationOptions,
): Promise<string> {
  switch (options.provider) {
    case "google-cloud": {
      if (!options.googleCloudApiKey) {
        throw new Error("Google Cloud API key not configured")
      }
      return translateWithGoogleCloud(
        text,
        sourceLang,
        targetLang,
        options.googleCloudApiKey,
      )
    }
    case "google-free":
      return translateWithGoogleFree(text, sourceLang, targetLang)
    case "ollama":
      return translateWithOllama(text, targetLang, options)
    case "libretranslate":
      return translateWithLibreTranslate(text, sourceLang, targetLang, options)
    case "huggingface":
      return translateWithHuggingFace(text, targetLang, options)
    case "deepl":
      return translateWithDeepL(text, sourceLang, targetLang, options)
    default:
      throw new Error(`Unknown translation provider: ${options.provider}`)
  }
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  options?: Partial<TranslationOptions>,
): Promise<string> {
  const mergedOptions = { ...getDefaultOptions(), ...options }

  return retryWithBackoff(
    () => translateWithProvider(text, sourceLang, targetLang, mergedOptions),
    {
      maxRetries: mergedOptions.maxRetries!,
      baseDelayMs: mergedOptions.baseDelayMs!,
    },
  )
}

export async function translateWithRetry(
  text: string,
  sourceLang: string,
  targetLang: string,
  options?: Partial<TranslationOptions>,
): Promise<TranslationResult> {
  const mergedOptions = { ...getDefaultOptions(), ...options }
  const translatedText = await translateText(
    text,
    sourceLang,
    targetLang,
    mergedOptions,
  )
  return { translatedText, provider: mergedOptions.provider }
}

export function getTranslationProvider(): TranslationProvider {
  return getDefaultOptions().provider
}
