/**
 * Anthropic Provider Adapter
 *
 * Vendor-specific logic lives HERE and ONLY here.
 * The core orchestration layer never imports @ai-sdk/anthropic directly.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import {
  ProviderAdapter,
  AdapterConfig,
  AdapterHealthResult,
  CapabilityFlag,
} from "./provider-adapter"

export class AnthropicAdapter implements ProviderAdapter {
  readonly adapterKey = "anthropic"
  readonly label = "Anthropic"

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
    // Lazy import to avoid hard dependency at module level
    const { anthropic } = require("@ai-sdk/anthropic")
    return anthropic(modelRef)
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
    return ["ANTHROPIC_API_KEY"]
  }
}
