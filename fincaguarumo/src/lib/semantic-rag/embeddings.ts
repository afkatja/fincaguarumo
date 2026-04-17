import { createClient } from "@supabase/supabase-js"
import {
  preprocessTextWithFallback,
  SupportedLanguage,
} from "./multilingual-preprocessing"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// TogetherAI configuration
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY!
const TOGETHER_EMBEDDING_MODEL = "intfloat/e5-base-instruct"
const TOGETHER_API_URL = "https://api.together.xyz/v1/embeddings"
const BATCH_SIZE = 100 // TogetherAI limit

// Timeout configuration
const API_TIMEOUT = 30000 // 30 seconds
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

// Helper function to create timeout promise
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
      timeoutMs,
    )
  })
}

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT,
): Promise<Response> {
  return Promise.race([fetch(url, options), createTimeoutPromise(timeoutMs)])
}

export interface EmbeddingResult {
  embedding: number[]
  dimensions: number
}

/**
 * Generate embeddings using TogetherAI e5-base-instruct model with multilingual preprocessing
 */
// Helper function to make TogetherAI API requests with timeout and retry
async function makeTogetherAIRequest(input: string | string[]): Promise<any> {
  let lastError: Error

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(TOGETHER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TOGETHER_EMBEDDING_MODEL,
          input,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(
          `TogetherAI API error: ${response.statusText} - ${errorText}`,
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
          `TogetherAI request failed with non-retryable error:`,
          error,
        )
        throw error
      }

      if (attempt === RETRY_ATTEMPTS) {
        console.error(
          `TogetherAI request failed after ${RETRY_ATTEMPTS} attempts:`,
          error,
        )
        throw lastError
      }

      console.warn(
        `TogetherAI request failed (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY}ms:`,
        error,
      )
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
    }
  }

  throw lastError!
}

export async function generateEmbedding(
  text: string,
  language?: SupportedLanguage | "auto",
): Promise<EmbeddingResult> {
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

    const data = await makeTogetherAIRequest(preprocessingResult.processedText)

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error("Invalid embedding response from TogetherAI")
    }

    return {
      embedding: data.data[0].embedding,
      dimensions: data.data[0].embedding.length,
    }
  } catch (error) {
    console.error("Error generating embedding:", error)
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Generate embeddings for multiple texts in batch with multilingual preprocessing
 */
export async function generateBatchEmbeddings(
  texts: string[],
  language?: SupportedLanguage | "auto",
): Promise<EmbeddingResult[]> {
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

  for (let i = 0; i < preprocessedTexts.length; i += BATCH_SIZE) {
    const batch = preprocessedTexts.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1

    try {
      const data = await makeTogetherAIRequest(batch)

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid batch embedding response from TogetherAI")
      }

      const batchResults = data.data.map((item: any) => ({
        embedding: item.embedding,
        dimensions: item.embedding.length,
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
