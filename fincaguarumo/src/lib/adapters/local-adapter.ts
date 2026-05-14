/**
 * Local Provider Adapter
 *
 * For locally-hosted models (e.g. Ollama, local embedding servers).
 * No API keys required — the adapter just needs a reachable endpoint.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"
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
    "multilingual",
  ])

  /** Default Ollama embedding endpoint */
  readonly embeddingEndpoint = "http://localhost:11434/api/embed"

  createModelInstance(
    _modelRef: string,
    _options?: Record<string, unknown>,
  ): LanguageModelV3 {
    // Local models don't use the AI SDK LanguageModelV3 interface directly.
    // They are accessed via raw HTTP (see embeddings-local.ts).
    // This method throws because local models should be accessed through
    // the embedding-specific path, not the generation path.
    throw new Error(
      "Local adapter does not support LanguageModelV3 generation. " +
        "Use the embedding-specific path for local models.",
    )
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
