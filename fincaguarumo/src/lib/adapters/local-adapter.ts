/**
 * Local Provider Adapter
 *
 * For locally-hosted models (e.g. Ollama, local embedding servers).
 * No API keys required — the adapter just needs a reachable endpoint.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
import { createOpenAI } from "@ai-sdk/openai"
import {
  ProviderAdapter,
  AdapterConfig,
  AdapterHealthResult,
  CapabilityFlag,
} from "./provider-adapter"

export class LocalAdapter implements ProviderAdapter {
  readonly adapterKey = "local"
  readonly label = "Local (Ollama)"

  private readonly supportedCapabilities: Set<CapabilityFlag> = new Set([
    "embedding",
    "generation",
    "toolCalling",
    "multilingual",
  ])

  /** Default Ollama endpoints */
  readonly embeddingEndpoint = "http://localhost:11434/api/embeddings"
  readonly generationEndpoint = "http://localhost:11434/v1"

  createModelInstance(
    modelRef: string,
    _options?: Record<string, unknown>,
  ): LanguageModelV3 {
    // Use AI SDK's OpenAI adapter to connect to Ollama's OpenAI-compatible endpoint
    // Ollama provides OpenAI-compatible API at /v1 endpoint
    const openai = createOpenAI({
      baseURL: this.generationEndpoint,
      apiKey: "ollama", // Ollama doesn't require real API key but OpenAI adapter expects one
    })

    return openai(modelRef)
  }

  async healthCheck(_modelRef: string): Promise<AdapterHealthResult> {
    const startTime = Date.now()
    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })

      return {
        isHealthy: response.ok,
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

  validateConfig(_config: AdapterConfig): {
    valid: boolean
    missing: string[]
  } {
    // Local providers don't need API keys
    return { valid: true, missing: [] }
  }

  supports(capability: CapabilityFlag): boolean {
    return this.supportedCapabilities.has(capability)
  }

  getRequiredSecrets(): string[] {
    // Local providers don't need API keys
    return []
  }
}
