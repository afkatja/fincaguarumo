/**
 * Adapter Registry
 *
 * The single place where adapter modules are registered.
 * Adding a new provider = registering a new adapter here.
 * The core factory/router never imports vendor SDKs — it only
 * asks this registry for an adapter by key.
 */

import { ProviderAdapter, AdapterConfig } from "./provider-adapter"
import { PerplexityAdapter } from "./perplexity-adapter"
import { MistralAdapter } from "./mistral-adapter"
import { OpenAIAdapter } from "./openai-adapter"
import { AnthropicAdapter } from "./anthropic-adapter"
import { TogetherAdapter } from "./together-adapter"
import { LocalAdapter } from "./local-adapter"

// ---------------------------------------------------------------------------
// Registry storage
// ---------------------------------------------------------------------------
const adapters = new Map<string, ProviderAdapter>()

// ---------------------------------------------------------------------------
// Built-in adapters — registered at module load time
// ---------------------------------------------------------------------------
const builtInAdapters: ProviderAdapter[] = [
  new PerplexityAdapter(),
  new MistralAdapter(),
  new OpenAIAdapter(),
  new AnthropicAdapter(),
  new TogetherAdapter(),
  new LocalAdapter(),
]

// Auto-register built-ins
for (const adapter of builtInAdapters) {
  adapters.set(adapter.adapterKey, adapter)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new provider adapter.
 * This is the extension point: a new provider is added by calling
 * this function with a concrete ProviderAdapter, not by editing
 * the factory's switch statement.
 */
export function registerAdapter(adapter: ProviderAdapter): void {
  if (adapters.has(adapter.adapterKey)) {
    console.warn(
      `⚠️ Adapter "${adapter.adapterKey}" is already registered. ` +
        `Overwriting with new instance.`,
    )
  }
  adapters.set(adapter.adapterKey, adapter)
}

/**
 * Retrieve an adapter by its logical key.
 * Throws if no adapter is registered for the given key.
 */
export function getAdapter(adapterKey: string): ProviderAdapter {
  const adapter = adapters.get(adapterKey)
  if (!adapter) {
    throw new Error(
      `No adapter registered for key "${adapterKey}". ` +
        `Available adapters: ${getRegisteredKeys().join(", ")}`,
    )
  }
  return adapter
}

/**
 * Check whether an adapter is registered for the given key.
 */
export function hasAdapter(adapterKey: string): boolean {
  return adapters.has(adapterKey)
}

/**
 * Return all registered adapter keys.
 */
export function getRegisteredKeys(): string[] {
  return Array.from(adapters.keys())
}

/**
 * Return all registered adapters.
 */
export function getAllAdapters(): ProviderAdapter[] {
  return Array.from(adapters.values())
}

/**
 * Validate that every adapter required by the given configs
 * has its secrets present in the environment.
 *
 * This replaces the old static `providerApiKeys` map — the core
 * no longer knows which env vars each provider needs; it asks
 * the adapters themselves.
 */
export function validateAllAdapters(configs: AdapterConfig[]): {
  isValid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []
  const seenKeys = new Set<string>()

  for (const config of configs) {
    if (!hasAdapter(config.adapterKey)) {
      warnings.push(
        `Adapter "${config.adapterKey}" is configured but not registered. ` +
          `Available: ${getRegisteredKeys().join(", ")}`,
      )
      continue
    }

    const adapter = getAdapter(config.adapterKey)
    const result = adapter.validateConfig(config)
    if (!result.valid) {
      missing.push(...result.missing)
    }
    seenKeys.add(config.adapterKey)
  }

  // Check for adapters that are registered but not used by any config
  for (const key of getRegisteredKeys()) {
    if (!seenKeys.has(key) && key !== "local") {
      const adapter = getAdapter(key)
      const secrets = adapter.getRequiredSecrets()
      const hasAnySecret = secrets.some(s => !!process.env[s])
      if (hasAnySecret) {
        warnings.push(
          `Adapter "${key}" has API keys set but no models are configured to use it`,
        )
      }
    }
  }

  return { isValid: missing.length === 0, missing, warnings }
}
