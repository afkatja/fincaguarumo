/**
 * Model-agnostic AI provider factory
 * Allows easy switching between different AI models for generation and evaluation
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import { perplexity } from "@ai-sdk/perplexity"
import { mistral } from "@ai-sdk/mistral"

export interface ModelConfig {
  provider: "perplexity" | "mistral" | "openai" | "anthropic"
  modelId: string
  maxTokens: number
  temperature?: number
}

export interface ModelProvider {
  model: LanguageModelV3
  modelId: string
  provider: string
  capabilities: {
    streaming: boolean
    tools: boolean
    evaluation: boolean
    generation: boolean
  }
  maxTokens: number
}

// Model configurations from environment variables
const modelConfigs: Record<string, ModelConfig> = {
  // Main generation model (with tools) - switched to Perplexity for better multilingual formatting
  generation: {
    provider: (process.env.MAIN_MODEL_PROVIDER as any) || "perplexity",
    modelId: process.env.MAIN_MODEL_ID || "llama-3.1-sonar-large-128k-online",
    maxTokens: parseInt(process.env.MAIN_MODEL_MAX_TOKENS || "1000"),
    temperature: parseFloat(process.env.MAIN_MODEL_TEMPERATURE || "0.3"),
  },

  // Evaluation model (uses same generation model for introspection mode)
  evaluation: {
    provider: (process.env.EVALUATOR_MODEL_PROVIDER as any) || "mistral",
    modelId: process.env.EVALUATOR_MODEL_ID || "mistral-large-latest",
    maxTokens: parseInt(process.env.EVALUATOR_MODEL_MAX_TOKENS || "2000"),
    temperature: parseFloat(process.env.EVALUATOR_MODEL_TEMPERATURE || "0.1"),
  },
}

// Model provider factory
export function createModelProvider(
  configKey: "generation" | "evaluation",
): ModelProvider {
  const config = modelConfigs[configKey]

  let model: LanguageModelV3
  let capabilities: ModelProvider["capabilities"]
  let maxTokens: number

  switch (configKey) {
    case "generation":
      model = mistral(config.modelId)
      capabilities = {
        streaming: true,
        tools: true,
        evaluation: true,
        generation: true,
      }
      maxTokens = config.maxTokens
      break
    case "evaluation":
      model = mistral(config.modelId)
      capabilities = {
        streaming: true,
        tools: true, // Mistral supports function calling
        evaluation: true,
        generation: true,
      }
      maxTokens = config.maxTokens
      break
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }

  return {
    model,
    modelId: config.modelId,
    provider: config.provider,
    capabilities,
    maxTokens,
  }
}

// Cache for evaluation data to avoid re-running tools
const evaluationCache = new Map<string, any>()

export function cacheEvaluationData(key: string, data: any) {
  evaluationCache.set(key, {
    data,
    timestamp: Date.now(),
  })
}

export function getCachedEvaluationData(key: string): any | null {
  const cached = evaluationCache.get(key)
  if (!cached) return null

  // Cache expires after 5 minutes
  if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
    evaluationCache.delete(key)
    return null
  }

  return cached.data
}

export function clearEvaluationCache() {
  evaluationCache.clear()
}

/**
 * Get all available model configurations
 */
export function getAvailableModels(): Record<string, ModelConfig> {
  return { ...modelConfigs }
}

/**
 * Add a new model configuration
 */
export function addModelConfig(key: string, config: ModelConfig): void {
  modelConfigs[key] = config
}

/**
 * Update an existing model configuration
 */
export function updateModelConfig(
  key: string,
  updates: Partial<ModelConfig>,
): void {
  if (modelConfigs[key]) {
    modelConfigs[key] = { ...modelConfigs[key], ...updates }
  }
}

/**
 * Test model connectivity
 */
export async function testModelConnectivity(configKey: string): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  try {
    const provider = createModelProvider(
      configKey as "generation" | "evaluation",
    )
    const startTime = Date.now()

    // Simple test request
    const { generateText } = await import("ai")
    await generateText({
      model: provider.model,
      prompt: "Test connectivity",
      maxRetries: 1,
    })

    const latency = Date.now() - startTime
    return { success: true, latency }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get model recommendations based on use case
 */
export function getModelRecommendation(
  useCase: "generation" | "evaluation" | "fast" | "quality",
): string[] {
  const recommendations = {
    generation: ["generation", "perplexity-sonar", "mistral-large"],
    evaluation: ["evaluation", "mistral-large"],
    fast: ["perplexity-sonar", "mistral-small"],
    quality: ["mistral-large", "evaluation"],
  }

  return recommendations[useCase] || []
}

/**
 * Environment variable validation for models
 */
export function validateModelEnvironment(): {
  isValid: boolean
  missing: string[]
  warnings: string[]
} {
  const required: Record<string, string[]> = {
    perplexity: ["PERPLEXITY_API_KEY"],
    mistral: ["MISTRAL_API_KEY"],
    openai: ["OPENAI_API_KEY"],
    anthropic: ["ANTHROPIC_API_KEY"],
  }

  const missing: string[] = []
  const warnings: string[] = []

  // Check current models
  Object.values(modelConfigs).forEach(config => {
    const requiredVars = required[config.provider]
    if (requiredVars) {
      requiredVars.forEach((varName: string) => {
        if (!process.env[varName]) {
          missing.push(varName)
        }
      })
    }
  })

  // Check for deprecated variables
  if (process.env.OPENAI_API_KEY && !modelConfigs.openai) {
    warnings.push("OPENAI_API_KEY found but no OpenAI models configured")
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  }
}
