import React from "react"

/**
 * Feature flag utilities for controlling feature availability
 */

/**
 * Check if a feature is enabled based on environment variables
 * @param flagName - The name of the feature flag (without NEXT_PUBLIC_ prefix)
 * @returns boolean - true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(flagName: string): boolean {
  const envVarName = `NEXT_PUBLIC_${flagName.toUpperCase()}`
  const envValue = process.env[envVarName]

  // Feature is enabled if the environment variable is exactly "true"
  return envValue === "true"
}

/**
 * Chatbot-specific feature flag
 */
export function isChatbotEnabled(): boolean {
  return isFeatureEnabled("CHATBOT_ENABLED")
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
