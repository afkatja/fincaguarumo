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
  libretranslateApiKey?: string
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

/**
 * Error thrown for failures that must not be retried (configuration errors,
 * 4xx client errors other than 408/429, empty provider responses).
 */
export class NonRetryableError extends Error {
  readonly retryable = false

  constructor(message: string) {
    super(message)
    this.name = "NonRetryableError"
  }
}

export function getDefaultOptions(): TranslationOptions {
  const env = process.env
  const provider = (env.TRANSLATION_PROVIDER || "google-cloud") as TranslationProvider

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
    libretranslateApiKey: process.env.LIBRETRANSLATE_API_KEY,
    huggingfaceToken: process.env.HUGGINGFACE_TOKEN,
    huggingfaceModel:
      process.env.HUGGINGFACE_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct",
    deeplAuthKey: process.env.DEEPL_AUTH_KEY,
    deeplFormality:
      (process.env.DEEPL_FORMALITY as "more" | "less" | "default") || "default",
    maxRetries: 3,
    baseDelayMs: 1000,
  }

  return options
}

/**
 * Validate the effective provider and its required credentials after any
 * request/call overrides have been merged. google-free requests do not
 * require a Google Cloud key. Providers that require credentials still raise
 * clear errors when they are missing.
 */
export function validateProviderOptions(options: TranslationOptions): void {
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
      const err =
        error instanceof Error ? error : new Error(String(error))

      // Non-retryable errors (configuration, 4xx, empty responses) are
      // rethrown immediately without retrying.
      if (
        err instanceof NonRetryableError ||
        (err as { retryable?: boolean }).retryable === false
      ) {
        throw err
      }

      lastError = err

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
    const msg = `Google Cloud Translate API error: ${error.error?.message || response.statusText}`
    const status = response.status
    const isClientError = status >= 400 && status < 500
    // 4xx errors are not retried except 408 (timeout) and 429 (rate limit).
    if (isClientError && status !== 408 && status !== 429) {
      throw new NonRetryableError(msg)
    }
    throw new Error(msg)
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
  const translated = data.response?.trim()
  if (!translated) {
    throw new NonRetryableError("Ollama returned an empty translation")
  }
  return translated
}

async function translateWithLibreTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  options: TranslationOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    q: text,
    source: sourceLang,
    target: targetLang,
    format: "text",
  }
  // Include the API key only when configured, preserving requests to keyless
  // instances.
  if (options.libretranslateApiKey) {
    body.api_key = options.libretranslateApiKey
  }

  const response = await fetch(options.libretranslateUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`LibreTranslate error: ${response.statusText}`)
  }

  const data = await response.json()
  const translated = data.translatedText
  if (!translated) {
    throw new NonRetryableError("LibreTranslate returned an empty translation")
  }
  return translated
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

  // Scale max_new_tokens with input length instead of truncating translations
  // at a fixed 100 tokens. A translation is typically similar in length to the
  // source text (roughly 4 chars per token).
  const estimatedTokens = Math.max(1, Math.ceil(text.length / 4))
  const maxNewTokens = Math.min(1024, Math.max(64, estimatedTokens + 64))

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
          max_new_tokens: maxNewTokens,
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
  const generated = data[0]?.generated_text?.trim()
  if (!generated) {
    throw new NonRetryableError("Hugging Face returned an empty translation")
  }
  // Detect length-limit termination so the translation fails rather than being
  // saved as complete.
  if (data[0]?.details?.finish_reason === "length") {
    throw new NonRetryableError(
      "Hugging Face translation truncated at length limit",
    )
  }
  return generated
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
  // Merge any request/call overrides before validating the effective provider
  // and its required credentials.
  const mergedOptions = { ...getDefaultOptions(), ...options }
  validateProviderOptions(mergedOptions)

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
  validateProviderOptions(mergedOptions)
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
