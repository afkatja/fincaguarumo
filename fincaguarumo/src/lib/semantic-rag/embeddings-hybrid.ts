/**
 * Hybrid Embedding Service
 *
 * Automatically switches between local Ollama and remote TogetherAI based on availability
 */

import {
  generateEmbedding as generateRemoteEmbedding,
  generateBatchEmbeddings as generateRemoteBatchEmbeddings,
  EmbeddingResult as RemoteEmbeddingResult,
} from "./embeddings"
import {
  generateEmbedding as generateLocalEmbedding,
  generateBatchEmbeddings as generateLocalBatchEmbeddings,
  EmbeddingResult as LocalEmbeddingResult,
  checkOllamaAvailability,
} from "./embeddings-local"

export interface EmbeddingResult {
  embedding: number[]
  dimensions: number
}

export interface EmbeddingConfig {
  preferLocal: boolean
  fallbackToRemote: boolean
  localTimeout: number
}

// Default configuration
const defaultConfig: EmbeddingConfig = {
  preferLocal: true,
  fallbackToRemote: true,
  localTimeout: 10000, // 10 seconds
}

/**
 * Get embedding configuration from environment
 */
function getEmbeddingConfig(): EmbeddingConfig {
  return {
    preferLocal: process.env.EMBEDDING_PREFER_LOCAL !== "false",
    fallbackToRemote: process.env.EMBEDDING_FALLBACK_TO_REMOTE !== "false",
    localTimeout: parseInt(process.env.EMBEDDING_LOCAL_TIMEOUT || "10000"),
  }
}

/**
 * Generate embedding with automatic fallback
 */
export async function generateEmbedding(
  text: string,
  config?: Partial<EmbeddingConfig>,
): Promise<EmbeddingResult> {
  const finalConfig = { ...defaultConfig, ...config }

  // Try local first if preferred
  if (finalConfig.preferLocal) {
    try {
      console.log("🏠 Attempting local embedding generation...")
      const isLocalAvailable = await Promise.race([
        checkOllamaAvailability(),
        new Promise<boolean>(resolve =>
          setTimeout(() => resolve(false), finalConfig.localTimeout),
        ),
      ])

      if (isLocalAvailable) {
        const result = await generateLocalEmbedding(text)
        console.log("✅ Local embedding generation successful")
        return result
      } else {
        console.log("⚠️  Local embedding not available, falling back...")
      }
    } catch (error) {
      console.warn(
        "⚠️  Local embedding failed:",
        error instanceof Error ? error.message : error,
      )
    }
  }

  // Fallback to remote if configured
  if (finalConfig.fallbackToRemote) {
    try {
      console.log("🌐 Attempting remote embedding generation...")
      const result = await generateRemoteEmbedding(text)
      console.log("✅ Remote embedding generation successful")
      return result
    } catch (error) {
      console.error(
        "❌ Remote embedding failed:",
        error instanceof Error ? error.message : error,
      )
      throw new Error(
        `All embedding methods failed. Local: ${error instanceof Error ? error.message : "Unknown"}, Remote: ${error instanceof Error ? error.message : "Unknown"}`,
      )
    }
  }

  throw new Error("No embedding method available. Check configuration.")
}

/**
 * Generate batch embeddings with automatic fallback
 */
export async function generateBatchEmbeddings(
  texts: string[],
  config?: Partial<EmbeddingConfig>,
): Promise<EmbeddingResult[]> {
  const finalConfig = { ...defaultConfig, ...config }

  // Try local first if preferred
  if (finalConfig.preferLocal) {
    try {
      console.log(
        `🏠 Attempting local batch embedding generation for ${texts.length} texts...`,
      )
      const isLocalAvailable = await Promise.race([
        checkOllamaAvailability(),
        new Promise<boolean>(resolve =>
          setTimeout(() => resolve(false), finalConfig.localTimeout),
        ),
      ])

      if (isLocalAvailable) {
        const result = await generateLocalBatchEmbeddings(texts)
        console.log(
          `✅ Local batch embedding generation successful (${result.length} embeddings)`,
        )
        return result
      } else {
        console.log("⚠️  Local batch embedding not available, falling back...")
      }
    } catch (error) {
      console.warn(
        "⚠️  Local batch embedding failed:",
        error instanceof Error ? error.message : error,
      )
    }
  }

  // Fallback to remote if configured
  if (finalConfig.fallbackToRemote) {
    try {
      console.log(
        `🌐 Attempting remote batch embedding generation for ${texts.length} texts...`,
      )
      const result = await generateRemoteBatchEmbeddings(texts)
      console.log(
        `✅ Remote batch embedding generation successful (${result.length} embeddings)`,
      )
      return result
    } catch (error) {
      console.error(
        "❌ Remote batch embedding failed:",
        error instanceof Error ? error.message : error,
      )
      throw new Error(
        `All batch embedding methods failed. Local: ${error instanceof Error ? error.message : "Unknown"}, Remote: ${error instanceof Error ? error.message : "Unknown"}`,
      )
    }
  }

  throw new Error("No batch embedding method available. Check configuration.")
}

/**
 * Get embedding service status
 */
export async function getEmbeddingStatus(): Promise<{
  localAvailable: boolean
  remoteAvailable: boolean
  preferredMethod: "local" | "remote"
  config: EmbeddingConfig
}> {
  const config = getEmbeddingConfig()

  // Check local availability
  const localAvailable = await checkOllamaAvailability()

  // Check remote availability (simple API key check)
  const remoteAvailable = !!process.env.TOGETHER_API_KEY

  return {
    localAvailable,
    remoteAvailable,
    preferredMethod: config.preferLocal && localAvailable ? "local" : "remote",
    config,
  }
}

/**
 * Test both embedding methods
 */
export async function testEmbeddingMethods(): Promise<{
  local: { success: boolean; error?: string; time?: number }
  remote: { success: boolean; error?: string; time?: number }
}> {
  const results = {
    local: { success: false, error: undefined, time: undefined },
    remote: { success: false, error: undefined, time: undefined },
  }

  // Test local
  try {
    const start = Date.now()
    await generateLocalEmbedding("test query")
    const time = Date.now() - start
    results.local = {
      success: true,
      time,
      error: undefined,
    }
  } catch (error) {
    results.local = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      time: undefined,
    }
  }

  // Test remote
  try {
    const start = Date.now()
    await generateRemoteEmbedding("test query")
    const time = Date.now() - start
    results.remote = {
      success: true,
      time,
      error: undefined,
    }
  } catch (error) {
    results.remote = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      time: undefined,
    }
  }

  return results
}

/**
 * Get embedding dimensions for current configuration
 */
export function getEmbeddingDimensions(): number {
  // Both local and remote should use the same dimensions for compatibility
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

/**
 * Force use of specific embedding method
 */
export async function generateLocalEmbeddingOnly(
  text: string,
): Promise<EmbeddingResult> {
  return await generateLocalEmbedding(text)
}

export async function generateRemoteEmbeddingOnly(
  text: string,
): Promise<EmbeddingResult> {
  return await generateRemoteEmbedding(text)
}
