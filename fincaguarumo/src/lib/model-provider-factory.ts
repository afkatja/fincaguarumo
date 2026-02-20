/**
 * Model-agnostic AI provider factory
 * Allows easy switching between different AI models for generation and evaluation
 */

import { LanguageModel } from "ai"
import { perplexity } from "@ai-sdk/perplexity"
import { mistral } from "@ai-sdk/mistral"
import { LanguageModelV3 } from "@ai-sdk/provider"

export interface ModelConfig {
  provider: "perplexity" | "mistral" | "openai" | "anthropic"
  modelId: string
  maxTokens?: number
  temperature?: number
}

export interface ModelProvider {
  model: LanguageModel
  modelId: string
  provider: string
  capabilities: {
    streaming: boolean
    tools: boolean
    evaluation: boolean
    generation: boolean
  }
}

// Model configurations
const modelConfigs: Record<string, ModelConfig> = {
  // Current generation model
  generation: {
    provider: "perplexity",
    modelId: "sonar-pro",
    maxTokens: 1000,
    temperature: 0.7,
  },

  // Current evaluation model
  evaluation: {
    provider: "mistral",
    modelId: "mistral-large-latest",
    maxTokens: 2000,
    temperature: 0.1,
  },

  // Alternative models for testing
  "perplexity-sonar": {
    provider: "perplexity",
    modelId: "sonar-pro",
    maxTokens: 1000,
    temperature: 0.7,
  },

  "mistral-small": {
    provider: "mistral",
    modelId: "mistral-small-latest",
    maxTokens: 1000,
    temperature: 0.7,
  },

  "mistral-medium": {
    provider: "mistral",
    modelId: "mistral-medium-latest",
    maxTokens: 2000,
    temperature: 0.7,
  },

  "mistral-large": {
    provider: "mistral",
    modelId: "mistral-large-latest",
    maxTokens: 4000,
    temperature: 0.7,
  },
}

/**
 * Create a model provider based on configuration key
 */
export function createModelProvider(configKey: string): ModelProvider {
  const config = modelConfigs[configKey]

  if (!config) {
    throw new Error(`Unknown model configuration: ${configKey}`)
  }

  let model: LanguageModelV3

  switch (config.provider) {
    case "perplexity":
      model = perplexity(config.modelId as any)
      break
    case "mistral":
      model = mistral(config.modelId as any)
      break
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }

  return {
    model,
    modelId: config.modelId,
    provider: config.provider,
    capabilities: {
      streaming: true,
      tools: configKey !== "evaluation", // Evaluation models typically don't need tools
      evaluation: configKey === "evaluation",
      generation: configKey !== "evaluation",
    },
  }
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
    const provider = createModelProvider(configKey)
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
