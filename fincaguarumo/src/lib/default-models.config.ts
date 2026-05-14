/**
 * Default Models Configuration — Deployment Manifest
 *
 * This file is the ONLY place where concrete model IDs and
 * adapter/model pairings live. It is intentionally kept outside
 * the core runtime (model-registry, model-provider-factory, task-router)
 * so that the core never hardcodes vendor-specific defaults.
 *
 * In production, all of these should be overridden via environment
 * variables. The values here serve as a convenient development manifest.
 */

import type { AdapterConfig } from "./adapters/provider-adapter"

// ---------------------------------------------------------------------------
// Role → (adapterKey, modelRef) defaults
// ---------------------------------------------------------------------------

export interface RoleDefaults {
  adapterKey: string
  modelRef: string
  maxTokens: number
  temperature: number
  /** Fallback chain: adapterKey:modelRef pairs */
  fallbacks: string
}

export const DEFAULT_ROLE_CONFIGS: Record<string, RoleDefaults> = {
  primary: {
    adapterKey: "perplexity",
    modelRef: "llama-3.1-sonar-large-128k-online",
    maxTokens: 1000,
    temperature: 0.3,
    fallbacks: "",
  },
  tools: {
    adapterKey: "mistral",
    modelRef: "mistral-large-latest",
    maxTokens: 2000,
    temperature: 0.1,
    fallbacks: "",
  },
  fast: {
    adapterKey: "perplexity",
    modelRef: "llama-3.1-sonar-small-128k-online",
    maxTokens: 500,
    temperature: 0.7,
    fallbacks: "",
  },
  evaluation: {
    adapterKey: "mistral",
    modelRef: "mistral-large-latest",
    maxTokens: 2000,
    temperature: 0.1,
    fallbacks: "",
  },
  "embedding-local": {
    adapterKey: "local",
    modelRef: "e5-base-instruct",
    maxTokens: 8192,
    temperature: 0,
    fallbacks: "",
  },
  "embedding-remote": {
    adapterKey: "together",
    modelRef: "intfloat/e5-base-instruct",
    maxTokens: 8192,
    temperature: 0,
    fallbacks: "",
  },
}

// ---------------------------------------------------------------------------
// Adapter configs derived from defaults (for validation)
// ---------------------------------------------------------------------------

export function getDefaultAdapterConfigs(): AdapterConfig[] {
  const seen = new Set<string>()
  const configs: AdapterConfig[] = []

  for (const role of Object.values(DEFAULT_ROLE_CONFIGS)) {
    if (!seen.has(role.adapterKey)) {
      seen.add(role.adapterKey)
      configs.push({
        adapterKey: role.adapterKey,
        requiredSecrets: [], // filled by the adapter itself via getRequiredSecrets()
      })
    }
  }

  return configs
}
