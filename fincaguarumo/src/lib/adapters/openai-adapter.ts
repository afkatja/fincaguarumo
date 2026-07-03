/**
 * OpenAI Provider Adapter
 *
 * Vendor-specific logic lives HERE and ONLY here.
 * The core orchestration layer never imports @ai-sdk/openai directly.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import {
  ProviderAdapter,
  AdapterConfig,
  AdapterHealthResult,
  CapabilityFlag,
} from "./provider-adapter"
import { openai } from "@ai-sdk/openai"

export class OpenAIAdapter implements ProviderAdapter {
  readonly adapterKey = "openai"
  readonly label = "OpenAI"

  private readonly supportedCapabilities: Set<CapabilityFlag> = new Set([
    "streaming",
    "toolCalling",
    "evaluation",
    "generation",
    "multilingual",
  ])

  createModelInstance(
    modelRef: string,
    _options?: Record<string, unknown>,
  ): LanguageModelV3 {
    return openai(modelRef)
  }

  async healthCheck(modelRef: string): Promise<AdapterHealthResult> {
    const startTime = Date.now()
    try {
      const model = this.createModelInstance(modelRef)
      const { generateText } = await import("ai")
      await generateText({ model, prompt: "Health check", maxRetries: 1 })
      return {
        isHealthy: true,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      }
    } catch (error) {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      }
    }
  }

  validateConfig(config: AdapterConfig): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    for (const secret of config.requiredSecrets) {
      if (!process.env[secret]) {
        missing.push(secret)
      }
    }
    return { valid: missing.length === 0, missing }
  }

  supports(capability: CapabilityFlag): boolean {
    return this.supportedCapabilities.has(capability)
  }

  getRequiredSecrets(): string[] {
    return ["OPENAI_API_KEY"]
  }
}
