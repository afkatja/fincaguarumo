/**
 * Adapter barrel export
 *
 * Re-exports all adapter types and the registry for convenient imports.
 */

export type {
  ProviderAdapter,
  AdapterConfig,
  AdapterHealthResult,
  CapabilityFlag,
} from "./provider-adapter"

export { PerplexityAdapter } from "./perplexity-adapter"
export { MistralAdapter } from "./mistral-adapter"
export { OpenAIAdapter } from "./openai-adapter"
export { AnthropicAdapter } from "./anthropic-adapter"
export { TogetherAdapter } from "./together-adapter"
export { LocalAdapter } from "./local-adapter"

export {
  registerAdapter,
  getAdapter,
  hasAdapter,
  getRegisteredKeys,
  getAllAdapters,
  validateAllAdapters,
} from "./adapter-registry"
