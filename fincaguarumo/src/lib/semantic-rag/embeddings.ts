import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// TogetherAI configuration
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY!
const TOGETHER_EMBEDDING_MODEL = "intfloat/e5-base-instruct"

export interface EmbeddingResult {
  embedding: number[]
  dimensions: number
}

/**
 * Generate embeddings using TogetherAI e5-base-instruct model
 */
export async function generateEmbedding(
  text: string,
): Promise<EmbeddingResult> {
  try {
    const response = await fetch("https://api.together.xyz/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TOGETHER_EMBEDDING_MODEL,
        input: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`TogetherAI API error: ${response.statusText}`)
    }

    const data = await response.json()

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
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[],
): Promise<EmbeddingResult[]> {
  const batchSize = 100 // TogetherAI limit
  const results: EmbeddingResult[] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    try {
      const response = await fetch("https://api.together.xyz/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TOGETHER_EMBEDDING_MODEL,
          input: batch,
        }),
      })

      if (!response.ok) {
        throw new Error(`TogetherAI API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid batch embedding response from TogetherAI")
      }

      const batchResults = data.data.map((item: any) => ({
        embedding: item.embedding,
        dimensions: item.embedding.length,
      }))

      results.push(...batchResults)
    } catch (error) {
      console.error(
        `Error generating batch embeddings for batch ${i / batchSize}:`,
        error,
      )
      throw error
    }
  }

  return results
}

/**
 * Store embedding in Supabase
 */
export async function storeEmbedding(
  contentId: string,
  contentType: string,
  language: string,
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
    language: string
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
