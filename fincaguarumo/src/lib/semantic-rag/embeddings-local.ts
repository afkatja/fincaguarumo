/**
 * Local Embedding Service using Ollama + Nomic embed-text
 *
 * This provides embedding generation using locally running Ollama with nomic-embed-text model
 */

import {
  preprocessTextWithFallback,
  SupportedLanguage,
} from "./multilingual-preprocessing"

export interface EmbeddingResult {
  embedding: number[]
  dimensions: number
}

/**
 * Generate embeddings using local Ollama with nomic-embed-text
 */
export async function generateEmbedding(
  text: string,
  language?: SupportedLanguage | "auto",
): Promise<EmbeddingResult> {
  try {
    // Preprocess text for better embedding quality
    const preprocessingResult = await preprocessTextWithFallback(
      text,
      language,
      {
        normalizeWhitespace: true,
        removeSpecialChars: true,
        lowercase: true,
        removeStopWords: false, // Keep stop words for better semantic understanding
      },
    )

    const response = await fetch("http://localhost:11434/api/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nomic-embed-text",
        input: preprocessingResult.processedText,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (
      !data.embeddings ||
      !Array.isArray(data.embeddings) ||
      data.embeddings.length === 0
    ) {
      throw new Error("Invalid embedding response from Ollama")
    }

    return {
      embedding: data.embeddings[0],
      dimensions: data.embeddings[0].length,
    }
  } catch (error) {
    console.error("Error generating local embedding:", error)
    throw new Error(
      `Failed to generate local embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[],
  language?: SupportedLanguage | "auto",
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = []

  console.log(
    `🏠 Processing local batch of ${texts.length} texts with language: ${language || "auto"}`,
  )

  // Ollama doesn't have batch embedding, so process sequentially
  for (const text of texts) {
    try {
      const result = await generateEmbedding(text, language)
      results.push(result)
    } catch (error) {
      console.error(`Error generating embedding for text: ${text}`, error)
      // Add a zero embedding as fallback
      results.push({
        embedding: new Array(768).fill(0),
        dimensions: 768,
      })
    }
  }

  console.log(`✅ Generated ${results.length} local embeddings successfully`)
  return results
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.models && Array.isArray(data.models) && data.models.length > 0
  } catch (error) {
    return false
  }
}

/**
 * Get available models from Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags")

    if (!response.ok) {
      throw new Error(`Failed to get models: ${response.statusText}`)
    }

    const data = await response.json()
    return data.models?.map((model: any) => model.name) || []
  } catch (error) {
    console.error("Error getting available models:", error)
    return []
  }
}

/**
 * Get embedding dimensions for local model
 */
export function getEmbeddingDimensions(): number {
  // nomic-embed-text uses 768 dimensions
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
