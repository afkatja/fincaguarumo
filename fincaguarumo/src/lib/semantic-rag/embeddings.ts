import { createClient } from "@supabase/supabase-js"
import {
  preprocessTextWithFallback,
  SupportedLanguage,
} from "./multilingual-preprocessing"
import { getAdapter, hasAdapter } from "../adapters/adapter-registry"
import type { TogetherAdapter } from "../adapters/together-adapter"
import type { LocalAdapter } from "../adapters/local-adapter"
import { getModelRole } from "../model-registry"

/**
 * Role-Based Embedding System - Phase 2 (Provider-Agnostic)
 *
 * API key and endpoint resolution is now delegated to adapter modules
 * instead of hardcoded provider maps. The core embedding logic only
 * knows about adapterKey and modelRef — never vendor names.
 */

/**
 * Get Supabase client with proper environment variable validation
 * Uses anon key for embedding operations
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is required")
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required",
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Role-based embedding configuration — reads from env, falls back to model registry
const getEmbeddingConfig = () => {
  // Get model roles from registry
  const embeddingLocalRole = getModelRole("embedding-local")
  const embeddingRemoteRole = getModelRole("embedding-remote")

  return {
    local: {
      adapterKey:
        process.env.EMBED_MODEL_LOCAL_PROVIDER ||
        process.env.EMBED_MODEL_LOCAL_ADAPTER_KEY ||
        embeddingLocalRole?.adapterKey ||
        "local",
      modelRef:
        process.env.EMBED_MODEL_LOCAL_MODEL_ID ||
        process.env.EMBED_MODEL_LOCAL_MODEL_REF ||
        "nomic-embed-text", // Force working model, ignore registry cache
      fallbacks: process.env.EMBED_MODEL_LOCAL_FALLBACKS || "",
    },
    remote: {
      adapterKey:
        process.env.EMBED_MODEL_REMOTE_PROVIDER ||
        process.env.EMBED_MODEL_REMOTE_ADAPTER_KEY ||
        embeddingRemoteRole?.adapterKey ||
        "together",
      modelRef:
        process.env.EMBED_MODEL_REMOTE_MODEL_ID ||
        process.env.EMBED_MODEL_REMOTE_MODEL_REF ||
        embeddingRemoteRole?.modelRef ||
        "intfloat/multilingual-e5-large-instruct",
      fallbacks: process.env.EMBED_MODEL_REMOTE_FALLBACKS || "",
    },
  }
}

// Timeout configuration
const API_TIMEOUT = 30000 // 30 seconds
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

// Helper function to add timeout to fetch requests with AbortController
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

export interface EmbeddingResult {
  embedding: number[]
  dimensions: number
}

// ---------------------------------------------------------------------------
// Adapter-resolved API key and endpoint — no hardcoded vendor maps
// ---------------------------------------------------------------------------

/**
 * Resolve the API key for a given adapter key by asking the adapter
 * for its required secrets and checking the environment.
 */
const getAdapterApiKey = (adapterKey: string): string | null => {
  if (!hasAdapter(adapterKey)) return null
  const adapter = getAdapter(adapterKey)
  const secrets = adapter.getRequiredSecrets()
  if (secrets.length === 0) return "" // e.g. local adapter
  // Return the first found secret value
  for (const secret of secrets) {
    if (process.env[secret]) return process.env[secret]!
  }
  return null
}

/**
 * Resolve the embedding API endpoint for a given adapter key.
 * Only adapters that support embedding have an `embeddingEndpoint` property.
 */
const getAdapterApiEndpoint = (adapterKey: string): string => {
  if (!hasAdapter(adapterKey)) {
    throw new Error(`No adapter registered for key: ${adapterKey}`)
  }
  const adapter = getAdapter(adapterKey)

  // Adapters that support embedding expose an `embeddingEndpoint` property
  if (
    "embeddingEndpoint" in adapter &&
    typeof (adapter as any).embeddingEndpoint === "string"
  ) {
    return (adapter as any).embeddingEndpoint as string
  }

  throw new Error(
    `Adapter "${adapterKey}" does not expose an embeddingEndpoint. ` +
      `It may not support embedding operations via HTTP.`,
  )
}

// ---------------------------------------------------------------------------
// Embedding request with retry — uses adapter-resolved key and endpoint
// ---------------------------------------------------------------------------

async function makeEmbeddingRequest(input: string | string[]): Promise<any> {
  const config = getEmbeddingConfig()
  const adapterKey = config.remote.adapterKey
  const apiKey = getAdapterApiKey(adapterKey)

  if (!apiKey && adapterKey !== "local") {
    throw new Error(
      `API key required for adapter: ${adapterKey}. ` +
        `Set the required environment variables for this adapter.`,
    )
  }

  const apiUrl = getAdapterApiEndpoint(adapterKey)
  const modelRef = config.remote.modelRef

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelRef,
          input,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`${adapterKey} API error details:`, {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        })
        const error = new Error(
          `${adapterKey} API error: ${response.status} ${response.statusText}`,
        )

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw error
        }

        throw error
      }

      return response.json()
    } catch (error) {
      lastError = error as Error

      // Don't retry on timeout or network errors that are clearly non-retryable
      if (
        error instanceof Error &&
        (error.message.includes("timeout") ||
          error.message.includes("401") || // Unauthorized
          error.message.includes("403") || // Forbidden
          error.message.includes("404") || // Not found
          error.message.includes("422") || // Unprocessable entity
          error.message.includes("validation") ||
          error.message.includes("invalid"))
      ) {
        console.error(
          `${adapterKey} request failed with non-retryable error:`,
          error,
        )
        throw error
      }

      if (attempt === RETRY_ATTEMPTS) {
        console.error(
          `${adapterKey} request failed after ${RETRY_ATTEMPTS} attempts:`,
          lastError,
        )
        throw lastError!
      }

      console.warn(
        `${adapterKey} request failed (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY}ms:`,
        error,
      )
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
    }
  }

  throw lastError!
}

/**
 * Generate embedding using appropriate provider based on environment and role
 */
export async function generateEmbedding(
  text: string,
  language?: SupportedLanguage | "auto",
): Promise<EmbeddingResult> {
  const config = getEmbeddingConfig()
  const startTime = Date.now()

  try {
    // Apply multilingual preprocessing
    const preprocessingResult = preprocessTextWithFallback(text, language, {
      normalizeWhitespace: true,
      removeSpecialChars: true,
      lowercase: true,
      removeStopWords: false, // Keep stop words for better semantic understanding
    })

    console.log(
      `🌐 Generating embedding for language: ${preprocessingResult.detectedLanguage || "unknown"}`,
    )
    console.log(
      `📝 Preprocessing steps: ${preprocessingResult.preprocessingSteps.join(", ")}`,
    )

    let data: any

    // Try local provider first in development
    if (
      process.env.NODE_ENV === "development" &&
      config.local.adapterKey === "local"
    ) {
      console.log(
        `🏠 Using local embedding adapter: ${config.local.adapterKey}:${config.local.modelRef}`,
      )

      // Use real Ollama embedding API
      const embeddingEndpoint = getAdapterApiEndpoint(config.local.adapterKey)

      const requestBody = {
        model: config.local.modelRef,
        prompt: preprocessingResult.processedText,
      }

      const rawResponse = await fetch(embeddingEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!rawResponse.ok) {
        throw new Error(
          `Ollama embedding request failed: ${rawResponse.status} ${rawResponse.statusText}`,
        )
      }

      const ollamaResponse = await rawResponse.json()

      // Ollama /api/embeddings returns embedding array directly in the embedding field
      // Convert to expected format for compatibility
      const embedding = ollamaResponse.embedding // Direct array from the embedding field
      if (!embedding) {
        console.error("Unexpected Ollama response format:", ollamaResponse)
        throw new Error(
          "Invalid embedding response from Ollama - missing embedding field",
        )
      }

      data = {
        data: [
          {
            embedding,
            dimensions: embedding.length,
          },
        ],
      }
    } else {
      // Use remote provider
      console.log(
        `🌐 Using remote embedding adapter: ${config.remote.adapterKey}:${config.remote.modelRef}`,
      )
      data = await makeEmbeddingRequest(preprocessingResult.processedText)
    }

    if (!data || !data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error("Invalid embedding response from adapter")
    }

    const embedding = data.data[0].embedding
    const dimensions = data.data[0].dimensions || 768

    return {
      embedding: embedding,
      dimensions: dimensions,
    }
  } catch (error) {
    console.error("Error generating embedding:", error)
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Generate embeddings for multiple texts in batch with role-based configuration
 */
export async function generateBatchEmbeddings(
  texts: string[],
  language?: SupportedLanguage | "auto",
): Promise<EmbeddingResult[]> {
  const config = getEmbeddingConfig()
  const results: EmbeddingResult[] = []

  console.log(
    `🌐 Processing batch of ${texts.length} texts with language: ${language || "auto"}`,
  )

  // Preprocess all texts first
  const preprocessedTexts = texts.map(text => {
    const result = preprocessTextWithFallback(text, language, {
      normalizeWhitespace: true,
      removeSpecialChars: true,
      lowercase: true,
      removeStopWords: false,
    })
    return result.processedText
  })

  // Process in batches
  const BATCH_SIZE = 100 // TogetherAI limit
  for (let i = 0; i < preprocessedTexts.length; i += BATCH_SIZE) {
    const batch = preprocessedTexts.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1

    try {
      const data = await makeEmbeddingRequest(batch)

      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid batch embedding response from adapter")
      }

      const batchResults = data.data.map((item: any) => ({
        embedding: item.embedding,
        dimensions: item.dimensions || 768,
      }))

      results.push(...batchResults)
      console.log(`✅ Batch ${batchNumber} processed successfully`)
    } catch (error) {
      console.error(
        `Error generating batch embeddings for batch ${batchNumber}:`,
        error,
      )
      throw error
    }
  }

  console.log(`✅ Generated ${results.length} embeddings successfully`)
  return results
}

/**
 * Store embedding in Supabase
 */
export async function storeEmbedding(
  contentId: string,
  contentType: string,
  language: SupportedLanguage | "unknown",
  content: string,
  embedding: number[],
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("content_embeddings").upsert({
      content_id: contentId,
      content_type: contentType,
      language,
      content,
      embedding,
      metadata,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`)
    }
  } catch (error) {
    console.error("Error storing embedding:", error)
    throw error
  }
}

/**
 * Store multiple embeddings in batch
 */
export async function storeBatchEmbeddings(
  embeddings: Array<{
    contentId: string
    contentType: string
    language: SupportedLanguage | "unknown"
    content: string
    embedding: number[]
    metadata?: Record<string, any>
  }>,
): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const records = embeddings.map(emb => ({
      content_id: emb.contentId,
      content_type: emb.contentType,
      language: emb.language,
      content: emb.content,
      embedding: emb.embedding,
      metadata: emb.metadata || {},
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("content_embeddings").upsert(records)

    if (error) {
      throw new Error(`Failed to store batch embeddings: ${error.message}`)
    }
  } catch (error) {
    console.error("Error storing batch embeddings:", error)
    throw error
  }
}

/**
 * Check if embedding exists for content
 */
export async function embeddingExists(
  contentId: string,
  contentType: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("content_embeddings")
      .select("id")
      .eq("content_id", contentId)
      .eq("content_type", contentType)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      throw error
    }

    return !!data
  } catch (error) {
    console.error("Error checking embedding existence:", error)
    return false
  }
}

/**
 * Get embedding dimensions for the model
 */
export function getEmbeddingDimensions(): number {
  // e5-base-instruct has 768 dimensions
  return 768
}

/**
 * Validate embedding format
 */
export function validateEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === getEmbeddingDimensions() &&
    embedding.every(dim => typeof dim === "number" && !isNaN(dim))
  )
}
