// Configuration for semantic RAG system
export interface SemanticRAGConfig {
  vectorStore: "pgvector" | "qdrant"
  enableBinaryQuantization: boolean
  qdrantUrl?: string
  qdrantApiKey?: string
}

// Default configuration
export const defaultConfig: SemanticRAGConfig = {
  vectorStore: "pgvector", // Default to pgvector for backward compatibility
  enableBinaryQuantization: false,
}

// Get configuration from environment variables
export function getSemanticRAGConfig(): SemanticRAGConfig {
  const vectorStore = (process.env.VECTOR_STORE || "pgvector") as
    | "pgvector"
    | "qdrant"
  const enableBinaryQuantization =
    process.env.ENABLE_BINARY_QUANTIZATION === "true"
  const nodeEnv = process.env.NODE_ENV || "development"

  // Support environment-specific API keys
  let qdrantApiKey = process.env.QDRANT_API_KEY
  if (nodeEnv === "production" && process.env.QDRANT_PROD_API_KEY) {
    qdrantApiKey = process.env.QDRANT_PROD_API_KEY
  } else if (nodeEnv === "development" && process.env.QDRANT_DEV_API_KEY) {
    qdrantApiKey = process.env.QDRANT_DEV_API_KEY
  }

  return {
    vectorStore,
    enableBinaryQuantization,
    qdrantUrl: process.env.QDRANT_URL,
    qdrantApiKey,
  }
}

// Check if Qdrant is properly configured
export function isQdrantConfigured(): boolean {
  const config = getSemanticRAGConfig()
  return (
    config.vectorStore === "qdrant" &&
    !!config.qdrantUrl &&
    !!config.qdrantApiKey &&
    config.enableBinaryQuantization
  )
}
