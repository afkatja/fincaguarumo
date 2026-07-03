/**
 * Token counting utilities for cost optimization
 * Uses approximate tokenization for different languages
 */

import {
  GENERATION_TOKEN_BUDGETS,
  getTokenBudget as getCentralizedTokenBudget,
} from "../default-models.config"

// Approximate token ratios for different languages
// English: ~4 chars per token, Spanish/Dutch: ~5 chars per token
const LANGUAGE_TOKEN_RATIOS: Record<string, number> = {
  en: 4.0,
  es: 5.0,
  nl: 5.0,
  de: 4.5,
  ru: 4.8, // Russian: Cyrillic script, inflectional morphology
}

/**
 * Estimate token count from text length and language
 */
export function estimateTokenCount(
  text: string,
  language: string = "en",
): number {
  const ratio = LANGUAGE_TOKEN_RATIOS[language] || LANGUAGE_TOKEN_RATIOS.en
  return Math.ceil(text.length / ratio)
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  language: string = "en",
): string {
  const estimatedTokens = estimateTokenCount(text, language)

  if (estimatedTokens <= maxTokens) {
    return text
  }

  const ratio = LANGUAGE_TOKEN_RATIOS[language] || LANGUAGE_TOKEN_RATIOS.en
  const maxChars = Math.floor(maxTokens * ratio * 0.9) // 90% to be safe

  if (maxChars >= text.length) {
    return text
  }

  return text.substring(0, maxChars) + "..."
}

/**
 * Get token budget for generation model role
 * Now uses centralized configuration
 */
export function getTokenBudget(
  role: keyof typeof GENERATION_TOKEN_BUDGETS,
): number {
  return getCentralizedTokenBudget(role)
}
