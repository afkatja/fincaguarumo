/**
 * Provider Adapter Interface
 *
 * The core orchestration layer only knows about this contract.
 * Vendor names, SDK imports, and auth rules live exclusively in
 * concrete adapter modules and deploy-time config — never in the
 * core factory, registry, or router.
 */

import { LanguageModelV3 } from "@ai-sdk/provider"

// ---------------------------------------------------------------------------
// Capability flags — the only thing the core routes on
// ---------------------------------------------------------------------------
export type CapabilityFlag =
  | "streaming"
  | "toolCalling"
  | "evaluation"
  | "generation"
  | "embedding"
  | "multilingual"

// ---------------------------------------------------------------------------
// Adapter configuration — supplied by the registry / env, never hardcoded
// ---------------------------------------------------------------------------
export interface AdapterConfig {
  /** Logical adapter key, e.g. "perplexity", "mistral", "openai" */
  adapterKey: string
  /** Human-readable label for logs / dashboards */
  label?: string
  /** Environment variable names this adapter requires */
  requiredSecrets: string[]
  /** Optional adapter-specific options (baseURL, custom headers, etc.) */
  options?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Health-check result returned by an adapter
// ---------------------------------------------------------------------------
export interface AdapterHealthResult {
  isHealthy: boolean
  latency?: number
  error?: string
  timestamp: Date
}

// ---------------------------------------------------------------------------
// The contract every provider adapter must implement
// ---------------------------------------------------------------------------
export interface ProviderAdapter {
  /** Logical key that identified this adapter at registration time */
  readonly adapterKey: string

  /** Human-readable label */
  readonly label: string

  /**
   * Create an AI SDK LanguageModelV3 instance for the given model reference.
   *
   * @param modelRef  — the model handle / model ID (e.g. "llama-3.1-sonar-large-128k-online")
   * @param options   — optional runtime overrides (temperature, baseURL, etc.)
   */
  createModelInstance(
    modelRef: string,
    options?: Record<string, unknown>,
  ): LanguageModelV3

  /**
   * Perform a lightweight health / connectivity check.
   * The core circuit-breaker system calls this; the adapter decides
   * what "healthy" means for its particular backend.
   */
  healthCheck(modelRef: string): Promise<AdapterHealthResult>

  /**
   * Validate that the current environment has everything this adapter needs
   * (API keys, reachable endpoints, etc.).
   */
  validateConfig(config: AdapterConfig): { valid: boolean; missing: string[] }

  /**
   * Query whether this adapter supports a given capability flag.
   * Used by the router to filter candidates.
   */
  supports(capability: CapabilityFlag): boolean

  /**
   * Return the list of environment-variable names this adapter requires.
   * The core validation layer calls this instead of maintaining its own map.
   */
  getRequiredSecrets(): string[]
}
