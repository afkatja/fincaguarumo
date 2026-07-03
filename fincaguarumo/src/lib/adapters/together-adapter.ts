/**
 * Together AI Provider Adapter
 *
 * Vendor-specific logic lives HERE and ONLY here.
 * Used primarily for remote embedding models via the Together API.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import {
  ProviderAdapter,
  AdapterConfig,
  AdapterHealthResult,
  CapabilityFlag,
} from "./provider-adapter"
import { createOpenAI } from "@ai-sdk/openai"

export class TogetherAdapter implements ProviderAdapter {
  readonly adapterKey = "together"
  readonly label = "Together AI"

  private readonly supportedCapabilities: Set<CapabilityFlag> = new Set([
    "embedding",
    "multilingual",
  ])

  /** Together API base URL for embedding requests */
  readonly embeddingEndpoint = "https://api.together.xyz/v1/embeddings"

  createModelInstance(
    modelRef: string,
    _options?: Record<string, unknown>,
  ): LanguageModelV3 {
    // Together uses the OpenAI-compatible SDK with custom baseURL
    const togetherAI = createOpenAI({
      baseURL: "https://api.together.xyz/v1",
      apiKey: process.env.TOGETHER_API_KEY,
    })
    return togetherAI(modelRef)
  }

  async healthCheck(modelRef: string): Promise<AdapterHealthResult> {
    const startTime = Date.now()
    try {
      const apiKey = process.env.TOGETHER_API_KEY
      if (!apiKey) {
        return {
          isHealthy: false,
          error: "TOGETHER_API_KEY not set",
          timestamp: new Date(),
        }
      }

      // Simple connectivity check via the embedding endpoint
      const response = await fetch(this.embeddingEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: modelRef, input: "health check" }),
      })

      return {
        isHealthy: response.ok || response.status === 429, // 429 = rate limited but service is up
        latency: Date.now() - startTime,
        error:
          response.ok || response.status === 429
            ? undefined
            : `HTTP ${response.status}: ${response.statusText}`,
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
    return ["TOGETHER_API_KEY"]
  }
}
