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
  maxInputTokens?: number // For embedding models - input sequence limit
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
  primaryLocal: ModelRole
  toolsLocal: ModelRole
  fastLocal: ModelRole
  evaluationLocal: ModelRole
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
  maxInputTokens?: number
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

  const maxInputTokens =
    parseInt(
      process.env[`${envPrefix}_MAX_INPUT_TOKENS`] ||
        (legacyEnvPrefix
          ? process.env[`${legacyEnvPrefix}_MAX_INPUT_TOKENS`]
          : undefined) ||
        String(defaults?.maxInputTokens ?? 0),
    ) || undefined

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

  return {
    adapterKey,
    modelRef,
    maxTokens,
    maxInputTokens,
    temperature,
    fallbacks,
  }
}

// ---------------------------------------------------------------------------
// Helper: create a ModelRole from config and capabilities
// ---------------------------------------------------------------------------

function createModelRole(
  id: string,
  config: {
    adapterKey: string
    modelRef: string
    maxTokens: number
    maxInputTokens?: number
    temperature: number
    fallbacks: string
  },
  capabilities: ModelCapability,
): ModelRole {
  return {
    id,
    adapterKey: config.adapterKey,
    modelRef: config.modelRef,
    declaredCapabilities: capabilities,
    maxTokens: config.maxTokens,
    maxInputTokens: config.maxInputTokens,
    temperature: config.temperature,
    fallbacks: parseFallbackChain(config.fallbacks),
    healthStatus: {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      circuitBreakerActive: false,
    },
  }
}

// ---------------------------------------------------------------------------
// Build the full model config from env + deployment manifest
// ---------------------------------------------------------------------------

export function getModelConfig(): ModelConfig {
  const primaryCfg = getRoleConfig("primary", "GEN_MODEL_PRIMARY", "MAIN_MODEL")
  const primary = createModelRole("primary", primaryCfg, {
    multilingual: true,
    toolCalling: true,
    evaluation: true,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const toolsCfg = getRoleConfig("tools", "GEN_MODEL_TOOLS")
  const tools = createModelRole("tools", toolsCfg, {
    multilingual: true,
    toolCalling: true,
    evaluation: false,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const fastCfg = getRoleConfig("fast", "GEN_MODEL_FAST")
  const fast = createModelRole("fast", fastCfg, {
    multilingual: true,
    toolCalling: false,
    evaluation: false,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const evalCfg = getRoleConfig("evaluation", "EVAL_MODEL")
  const evaluation = createModelRole("evaluation", evalCfg, {
    multilingual: true,
    toolCalling: true,
    evaluation: true,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const embedLocalCfg = getRoleConfig("embedding-local", "EMBED_MODEL_LOCAL")
  const embeddingLocal = createModelRole("embedding-local", embedLocalCfg, {
    multilingual: true,
    toolCalling: false,
    evaluation: false,
    generation: false,
    embedding: true,
    streaming: false,
  })

  const embedRemoteCfg = getRoleConfig("embedding-remote", "EMBED_MODEL_REMOTE")
  const embeddingRemote = createModelRole("embedding-remote", embedRemoteCfg, {
    multilingual: true,
    toolCalling: false,
    evaluation: false,
    generation: false,
    embedding: true,
    streaming: false,
  })

  // Local generation roles for development cost savings
  const primaryLocalCfg = getRoleConfig(
    "primary-local",
    "GEN_MODEL_PRIMARY_LOCAL",
  )
  const primaryLocal = createModelRole("primary-local", primaryLocalCfg, {
    multilingual: true,
    toolCalling: true,
    evaluation: true,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const toolsLocalCfg = getRoleConfig("tools-local", "GEN_MODEL_TOOLS_LOCAL")
  const toolsLocal = createModelRole("tools-local", toolsLocalCfg, {
    multilingual: true,
    toolCalling: true,
    evaluation: false,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const fastLocalCfg = getRoleConfig("fast-local", "GEN_MODEL_FAST_LOCAL")
  const fastLocal = createModelRole("fast-local", fastLocalCfg, {
    multilingual: true,
    toolCalling: false,
    evaluation: false,
    generation: true,
    embedding: false,
    streaming: true,
  })

  const evalLocalCfg = getRoleConfig("evaluation-local", "EVAL_MODEL_LOCAL")
  const evaluationLocal = createModelRole("evaluation-local", evalLocalCfg, {
    multilingual: true,
    toolCalling: true,
    evaluation: true,
    generation: true,
    embedding: false,
    streaming: true,
  })

  return {
    primary,
    tools,
    fast,
    evaluation,
    primaryLocal,
    toolsLocal,
    fastLocal,
    evaluationLocal,
    embeddingLocal,
    embeddingRemote,
  }
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
    case "primary-local":
      return config.primaryLocal
    case "tools-local":
      return config.toolsLocal
    case "fast-local":
      return config.fastLocal
    case "evaluation-local":
      return config.evaluationLocal
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
