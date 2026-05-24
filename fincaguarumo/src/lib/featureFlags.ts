import React from "react"

/**
 * Feature flag utilities for controlling feature availability
 */

type FeatureFlagDefinition = {
  configKey: string
  envVarName: string
  fallback: () => boolean
}

const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  CHATBOT_ENABLED: {
    configKey: "CHATBOT_ENABLED",
    envVarName: "NEXT_PUBLIC_CHATBOT_ENABLED",
    fallback: () =>
      typeof window !== "undefined" &&
      window.location.hostname === "localhost" &&
      window.location.protocol === "https:",
  },
}

function getFeatureFlagDefinition(flagName: string): FeatureFlagDefinition {
  return (
    FEATURE_FLAGS[flagName] ?? {
      configKey: flagName,
      envVarName: `NEXT_PUBLIC_${flagName.toUpperCase()}`,
      fallback: () => false,
    }
  )
}

// Cache for configuration to avoid repeated API calls
let configCache: Record<string, boolean> | null = null
const configPromises = new Map<string, Promise<boolean | undefined>>()

/**
 * Fetch configuration from API route (fool-proof approach)
 * This bypasses environment variable embedding issues entirely
 */
async function fetchFeatureFlag(
  flag: FeatureFlagDefinition,
): Promise<boolean | undefined> {
  if (configCache?.[flag.configKey] !== undefined) {
    return configCache[flag.configKey]
  }

  const cachedPromise = configPromises.get(flag.configKey)

  if (cachedPromise) return cachedPromise

  const configPromise = (async () => {
    try {
      const response = await fetch(
        `/api/config?flag=${encodeURIComponent(flag.configKey)}`,
      )

      if (!response.ok) return undefined

      const config = await response.json()

      configCache = {
        ...configCache,
        ...config,
      }

      return config[flag.configKey]
    } catch (error) {
      return undefined
    } finally {
      configPromises.delete(flag.configKey)
    }
  })()

  configPromises.set(flag.configKey, configPromise)

  return configPromise
}

/**
 * Check if a feature is enabled based on environment variables
 * @param flagName - The name of the feature flag
 * @returns boolean - true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(flagName: string): boolean {
  const flag = getFeatureFlagDefinition(flagName)
  const envValue = process.env[flag.envVarName]

  if (envValue !== undefined) {
    return envValue === "true"
  }

  if (configCache) {
    return configCache[flag.configKey] ?? flag.fallback()
  }

  return flag.fallback()
}

/**
 * Async version that reads client-safe config from the API route
 */
export async function isFeatureEnabledAsync(
  flagName: string,
): Promise<boolean> {
  const flag = getFeatureFlagDefinition(flagName)
  const configValue = await fetchFeatureFlag(flag)

  return configValue ?? flag.fallback()
}

/**
 * Chatbot-specific feature flag
 */
export function isChatbotEnabled(): boolean {
  return isFeatureEnabled("CHATBOT_ENABLED")
}

/**
 * Async version for client-side components that can handle loading
 */
export async function isChatbotEnabledAsync(): Promise<boolean> {
  return isFeatureEnabledAsync("CHATBOT_ENABLED")
}

/**
 * Hook for checking chatbot feature flag in React components
 */
export function useChatbotFeature() {
  return {
    isEnabled: isChatbotEnabled(),
    isDisabled: !isChatbotEnabled(),
  }
}

/**
 * Type guard for conditional component rendering
 */
export type ChatbotFeatureProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component that conditionally renders children based on chatbot feature flag
 */
export function ChatbotFeature({
  children,
  fallback = null,
}: ChatbotFeatureProps) {
  if (isChatbotEnabled()) {
    return React.createElement(React.Fragment, null, children)
  }

  return React.createElement(React.Fragment, null, fallback)
}
