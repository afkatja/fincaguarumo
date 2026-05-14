/**
 * Model Provider Registry for Role-Based AI Model System
 *
 * Manages model capabilities, health status, and role-based routing.
 *
 * KEY CHANGES (provider-agnostic refactor):
 * - `provider` → `adapterKey`  (no vendor names in core logic)
 * - `modelId`  → `modelRef`   (runtime handle, not a family assumption)
 * - Concrete defaults moved to `default-models.config.ts`
 * - Capabilities split into `declaredCapabilities` and optional
 *   `verifiedCapabilities`; routing uses `effectiveCapabilities`
 */

import { DEFAULT_ROLE_CONFIGS } from "./default-models.config"
import type { CapabilityFlag } from "./adapters/provider-adapter"

// ---------------------------------------------------------------------------
// Capability sets
// ---------------------------------------------------------------------------

export interface ModelCapability {
  multilingual: boolean
  toolCalling: boolean
  evaluation: boolean
  generation: boolean
  embedding: boolean
  streaming: boolean
}

// ---------------------------------------------------------------------------
// Core types — no vendor names anywhere
// ---------------------------------------------------------------------------

export interface FallbackEntry {
  adapterKey: string
  modelRef: string
}

export interface ModelRole {
  id: string
  /** Logical adapter key — resolved at runtime via the adapter registry */
  adapterKey: string
  /** Model handle / reference understood by the adapter */
  modelRef: string
  /** Capabilities declared in config (may be optimistic) */
  declaredCapabilities: ModelCapability
  /** Capabilities verified by smoke tests / benchmarks (optional) */
  verifiedCapabilities?: Partial<ModelCapability>
  maxTokens: number
  temperature?: number
  fallbacks: FallbackEntry[]
  healthStatus: {
    isHealthy: boolean
    lastChecked: Date
    consecutiveFailures: number
    circuitBreakerActive: boolean
  }
}

export interface ModelConfig {
  primary: ModelRole
  tools: ModelRole
  fast: ModelRole
  evaluation: ModelRole
  embeddingLocal: ModelRole
  embeddingRemote: ModelRole
}

export interface FallbackChain {
  currentIndex: number
  models: FallbackEntry[]
  attemptHistory: Array<{
    adapterKey: string
    modelRef: string
    timestamp: Date
    success: boolean
    error?: string
    latency?: number
  }>
}

// ---------------------------------------------------------------------------
// Effective capabilities = declared ∩ verified
// ---------------------------------------------------------------------------

export function getEffectiveCapabilities(role: ModelRole): ModelCapability {
  const declared = role.declaredCapabilities
  const verified = role.verifiedCapabilities

  if (!verified) return declared

  return {
    multilingual: verified.multilingual ?? declared.multilingual,
    toolCalling: verified.toolCalling ?? declared.toolCalling,
    evaluation: verified.evaluation ?? declared.evaluation,
    generation: verified.generation ?? declared.generation,
    embedding: verified.embedding ?? declared.embedding,
    streaming: verified.streaming ?? declared.streaming,
  }
}

// ---------------------------------------------------------------------------
// Parse fallback chain from environment variable string
// Format: adapterKey-a:modelRef-x,adapterKey-b:modelRef-y
// ---------------------------------------------------------------------------

export function parseFallbackChain(fallbacksEnv: string): FallbackEntry[] {
  if (!fallbacksEnv) return []

  return fallbacksEnv.split(",").map(entry => {
    const [adapterKey, modelRef] = entry.trim().split(":")
    if (!adapterKey || !modelRef) {
      throw new Error(`Invalid fallback format: ${entry}`)
    }
    return { adapterKey: adapterKey.trim(), modelRef: modelRef.trim() }
  })
}

// ---------------------------------------------------------------------------
// Helper: read a role's config from env with fallback to default-models.config
// ---------------------------------------------------------------------------

function getRoleConfig(
  roleId: string,
  envPrefix: string,
  legacyEnvPrefix?: string,
): {
  adapterKey: string
  modelRef: string
  maxTokens: number
  temperature: number
  fallbacks: string
} {
  const defaults = DEFAULT_ROLE_CONFIGS[roleId]

  // FG-29 canonical: *_PROVIDER / *_MODEL_ID; *_ADAPTER_KEY / *_MODEL_REF are aliases
  const adapterKey =
    process.env[`${envPrefix}_PROVIDER`] ||
    process.env[`${envPrefix}_ADAPTER_KEY`] ||
    (legacyEnvPrefix
      ? process.env[`${legacyEnvPrefix}_PROVIDER`] ||
        process.env[`${legacyEnvPrefix}_ADAPTER_KEY`]
      : undefined) ||
    defaults?.adapterKey ||
    ""

  const modelRef =
    process.env[`${envPrefix}_MODEL_ID`] ||
    process.env[`${envPrefix}_MODEL_REF`] ||
    (legacyEnvPrefix
      ? process.env[`${legacyEnvPrefix}_MODEL_ID`] ||
        process.env[`${legacyEnvPrefix}_MODEL_REF`]
      : undefined) ||
    defaults?.modelRef ||
    ""

  const maxTokens = parseInt(
    process.env[`${envPrefix}_MAX_TOKENS`] ||
      (legacyEnvPrefix
        ? process.env[`${legacyEnvPrefix}_MAX_TOKENS`]
        : undefined) ||
      String(defaults?.maxTokens ?? 1000),
  )

  const temperature = parseFloat(
    process.env[`${envPrefix}_TEMPERATURE`] ||
      (legacyEnvPrefix
        ? process.env[`${legacyEnvPrefix}_TEMPERATURE`]
        : undefined) ||
      String(defaults?.temperature ?? 0.3),
  )

  const fallbacks =
    process.env[`${envPrefix}_FALLBACKS`] ||
    (legacyEnvPrefix
      ? process.env[`${legacyEnvPrefix}_FALLBACKS`]
      : undefined) ||
    defaults?.fallbacks ||
    ""

  return { adapterKey, modelRef, maxTokens, temperature, fallbacks }
}

// ---------------------------------------------------------------------------
// Build the full model config from env + deployment manifest
// ---------------------------------------------------------------------------

export function getModelConfig(): ModelConfig {
  // Primary Generation Models
  const primaryCfg = getRoleConfig("primary", "GEN_MODEL_PRIMARY", "MAIN_MODEL")
  const primary: ModelRole = {
    id: "primary",
    adapterKey: primaryCfg.adapterKey,
    modelRef: primaryCfg.modelRef,
    declaredCapabilities: {
      multilingual: true,
      toolCalling: true,
      evaluation: true,
      generation: true,
      embedding: false,
      streaming: true,
    },
    maxTokens: primaryCfg.maxTokens,
    temperature: primaryCfg.temperature,
    fallbacks: parseFallbackChain(primaryCfg.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }

  // Tools Generation Models
  const toolsCfg = getRoleConfig("tools", "GEN_MODEL_TOOLS")
  const tools: ModelRole = {
    id: "tools",
    adapterKey: toolsCfg.adapterKey,
    modelRef: toolsCfg.modelRef,
    declaredCapabilities: {
      multilingual: true,
      toolCalling: true,
      evaluation: false,
      generation: true,
      embedding: false,
      streaming: true,
    },
    maxTokens: toolsCfg.maxTokens,
    temperature: toolsCfg.temperature,
    fallbacks: parseFallbackChain(toolsCfg.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }

  // Fast Generation Models
  const fastCfg = getRoleConfig("fast", "GEN_MODEL_FAST")
  const fast: ModelRole = {
    id: "fast",
    adapterKey: fastCfg.adapterKey,
    modelRef: fastCfg.modelRef,
    declaredCapabilities: {
      multilingual: true,
      toolCalling: false,
      evaluation: false,
      generation: true,
      embedding: false,
      streaming: true,
    },
    maxTokens: fastCfg.maxTokens,
    temperature: fastCfg.temperature,
    fallbacks: parseFallbackChain(fastCfg.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }

  // Evaluation Models
  const evalCfg = getRoleConfig("evaluation", "EVAL_MODEL")
  const evaluation: ModelRole = {
    id: "evaluation",
    adapterKey: evalCfg.adapterKey,
    modelRef: evalCfg.modelRef,
    declaredCapabilities: {
      multilingual: true,
      toolCalling: true,
      evaluation: true,
      generation: true,
      embedding: false,
      streaming: true,
    },
    maxTokens: evalCfg.maxTokens,
    temperature: evalCfg.temperature,
    fallbacks: parseFallbackChain(evalCfg.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }

  // Local Embedding Models
  const embedLocalCfg = getRoleConfig("embedding-local", "EMBED_MODEL_LOCAL")
  const embeddingLocal: ModelRole = {
    id: "embedding-local",
    adapterKey: embedLocalCfg.adapterKey,
    modelRef: embedLocalCfg.modelRef,
    declaredCapabilities: {
      multilingual: true,
      toolCalling: false,
      evaluation: false,
      generation: false,
      embedding: true,
      streaming: false,
    },
    maxTokens: embedLocalCfg.maxTokens,
    temperature: embedLocalCfg.temperature,
    fallbacks: parseFallbackChain(embedLocalCfg.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }

  // Remote Embedding Models
  const embedRemoteCfg = getRoleConfig("embedding-remote", "EMBED_MODEL_REMOTE")
  const embeddingRemote: ModelRole = {
    id: "embedding-remote",
    adapterKey: embedRemoteCfg.adapterKey,
    modelRef: embedRemoteCfg.modelRef,
    declaredCapabilities: {
      multilingual: true,
      toolCalling: false,
      evaluation: false,
      generation: false,
      embedding: true,
      streaming: false,
    },
    maxTokens: embedRemoteCfg.maxTokens,
    temperature: embedRemoteCfg.temperature,
    fallbacks: parseFallbackChain(embedRemoteCfg.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }

  return { primary, tools, fast, evaluation, embeddingLocal, embeddingRemote }
}

// ---------------------------------------------------------------------------
// Role lookup
// ---------------------------------------------------------------------------

export function getModelRole(roleId: string): ModelRole | null {
  const config = getModelConfig()
  switch (roleId) {
    case "primary":
      return config.primary
    case "tools":
      return config.tools
    case "fast":
      return config.fast
    case "evaluation":
      return config.evaluation
    case "embedding-local":
      return config.embeddingLocal
    case "embedding-remote":
      return config.embeddingRemote
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Capability queries — use effectiveCapabilities
// ---------------------------------------------------------------------------

export function hasCapability(
  role: ModelRole,
  capability: keyof ModelCapability,
): boolean {
  return getEffectiveCapabilities(role)[capability]
}

export function getModelsByCapability(
  capability: keyof ModelCapability,
): ModelRole[] {
  const config = getModelConfig()
  const allRoles = Object.values(config)

  return allRoles.filter(role => getEffectiveCapabilities(role)[capability])
}
