/**
 * Default Models Configuration — Deployment Manifest
 *
 * This file is the ONLY place where concrete model IDs and
 * adapter/model pairings live. It is intentionally kept outside
 * the core runtime (model-registry, model-gateway, task-router)
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
  maxInputTokens?: number // For embedding models - input sequence limit
  temperature: number
  /** Fallback chain: adapterKey:modelRef pairs */
  fallbacks: string
}

/**
 * Centralized token budget configuration for generation models
 * These values are used across the system for cost optimization
 */
export const GENERATION_TOKEN_BUDGETS = {
  tools: 800,
  fast: 200,
  primary: 600,
  evaluation: 400,
} as const

/**
 * Input sequence limits for embedding models
 * These values control chunking and input processing for embeddings
 */
export const EMBEDDING_INPUT_LIMITS = {
  "embedding-local": 512,
  "embedding-remote": 512,
} as const

/**
 * Get token budget for a generation model role
 */
export function getTokenBudget(
  role: keyof typeof GENERATION_TOKEN_BUDGETS,
): number {
  return GENERATION_TOKEN_BUDGETS[role] || GENERATION_TOKEN_BUDGETS.primary
}

/**
 * Get input limit for an embedding model role
 */
export function getEmbeddingInputLimit(
  role: keyof typeof EMBEDDING_INPUT_LIMITS,
): number {
  return EMBEDDING_INPUT_LIMITS[role] || 512
}

export const DEFAULT_ROLE_CONFIGS: Record<string, RoleDefaults> = {
  primary: {
    adapterKey: "together",
    modelRef: "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    maxTokens: GENERATION_TOKEN_BUDGETS.primary,
    temperature: 0.3,
    fallbacks: "together:Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
  },
  tools: {
    adapterKey: "together",
    modelRef: "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    maxTokens: GENERATION_TOKEN_BUDGETS.tools,
    temperature: 0.1,
    fallbacks: "together:Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
  },
  fast: {
    adapterKey: "together",
    modelRef: "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    maxTokens: GENERATION_TOKEN_BUDGETS.fast,
    temperature: 0.7,
    fallbacks: "",
  },
  evaluation: {
    adapterKey: "together",
    modelRef: "Qwen/QwQ-32B",
    maxTokens: GENERATION_TOKEN_BUDGETS.evaluation,
    temperature: 0.1,
    fallbacks: "together:Qwen/QwQ-32B",
  },
  // Local generation models for development cost savings
  "primary-local": {
    adapterKey: "local",
    modelRef: "qwen3:8b",
    maxTokens: GENERATION_TOKEN_BUDGETS.primary,
    temperature: 0.3,
    fallbacks: "together:Qwen/Qwen3-235B-A22B-Instruct-2507-tput", // Fallback to remote
  },
  "tools-local": {
    adapterKey: "local",
    modelRef: "qwen3:8b",
    maxTokens: GENERATION_TOKEN_BUDGETS.tools,
    temperature: 0.1,
    fallbacks: "together:Qwen/Qwen3-235B-A22B-Instruct-2507-tput", // Fallback to remote
  },
  "fast-local": {
    adapterKey: "local",
    modelRef: "llama3.2:1b",
    maxTokens: GENERATION_TOKEN_BUDGETS.fast,
    temperature: 0.7,
    fallbacks: "", // No fallback for fast local
  },
  "evaluation-local": {
    adapterKey: "local",
    modelRef: "qwen3:8b",
    maxTokens: GENERATION_TOKEN_BUDGETS.evaluation,
    temperature: 0.1,
    fallbacks: "together:Qwen/QwQ-32B", // Fallback to remote evaluation
  },
  "embedding-local": {
    adapterKey: "local",
    modelRef: "nomic-embed-text",
    maxTokens: 0, // Not used for embeddings (fixed-size vector output)
    maxInputTokens: EMBEDDING_INPUT_LIMITS["embedding-local"], // Input sequence limit for chunking
    temperature: 0,
    fallbacks: "",
  },
  "embedding-remote": {
    adapterKey: "together",
    modelRef: "intfloat/e5-base-instruct",
    maxTokens: 0, // Not used for embeddings (fixed-size vector output)
    maxInputTokens: EMBEDDING_INPUT_LIMITS["embedding-remote"], // Input sequence limit for chunking
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
