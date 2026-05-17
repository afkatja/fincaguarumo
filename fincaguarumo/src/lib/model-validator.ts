/**
 * Model Validation Guardrails
 * 
 * Prevents infinite loops from invalid model names by validating models
 * before they're used in the gateway. This includes checking model existence
 * and maintaining a blacklist of failed models.
 */

import { ModelRole } from "./model-registry"
import { getAdapter } from "./adapters/adapter-registry"

// ---------------------------------------------------------------------------
// Model validation cache and blacklist
// ---------------------------------------------------------------------------

interface ModelValidationResult {
  isValid: boolean
  error?: string
  lastChecked: Date
  retryAfter?: Date
}

// In-memory cache for validation results (TTL: 1 hour)
const validationCache = new Map<string, ModelValidationResult>()

// Blacklist for models that have failed multiple times
const blacklistedModels = new Map<string, {
  failureCount: number
  lastFailure: Date
  blacklistedUntil: Date
}>()

// ---------------------------------------------------------------------------
// Validation configuration
// ---------------------------------------------------------------------------

const VALIDATION_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_FAILURES_BEFORE_BLACKLIST = 3
const BLACKLIST_DURATION_MS = 30 * 60 * 1000 // 30 minutes

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getCacheKey(adapterKey: string, modelRef: string): string {
  return `${adapterKey}:${modelRef}`
}

function isCacheExpired(result: ModelValidationResult): boolean {
  return Date.now() - result.lastChecked.getTime() > VALIDATION_CACHE_TTL_MS
}

function isBlacklisted(adapterKey: string, modelRef: string): boolean {
  const key = getCacheKey(adapterKey, modelRef)
  const blacklistEntry = blacklistedModels.get(key)
  
  if (!blacklistEntry) return false
  
  if (Date.now() > blacklistEntry.blacklistedUntil.getTime()) {
    blacklistedModels.delete(key)
    return false
  }
  
  return true
}

function addToBlacklist(adapterKey: string, modelRef: string): void {
  const key = getCacheKey(adapterKey, modelRef)
  const existing = blacklistedModels.get(key)
  
  if (existing) {
    existing.failureCount++
    existing.lastFailure = new Date()
    
    if (existing.failureCount >= MAX_FAILURES_BEFORE_BLACKLIST) {
      existing.blacklistedUntil = new Date(Date.now() + BLACKLIST_DURATION_MS)
      console.warn(`🚫 Model ${key} blacklisted until ${existing.blacklistedUntil.toISOString()}`)
    }
  } else {
    blacklistedModels.set(key, {
      failureCount: 1,
      lastFailure: new Date(),
      blacklistedUntil: new Date(Date.now() + BLACKLIST_DURATION_MS)
    })
  }
}

// ---------------------------------------------------------------------------
// Model validation functions
// ---------------------------------------------------------------------------

/**
 * Validate a model by attempting a lightweight health check
 */
async function validateModelExistence(
  adapterKey: string, 
  modelRef: string
): Promise<ModelValidationResult> {
  const cacheKey = getCacheKey(adapterKey, modelRef)
  
  // Check cache first
  const cached = validationCache.get(cacheKey)
  if (cached && !isCacheExpired(cached)) {
    return cached
  }
  
  // Check blacklist
  if (isBlacklisted(adapterKey, modelRef)) {
    return {
      isValid: false,
      error: "Model is blacklisted due to repeated failures",
      lastChecked: new Date(),
      retryAfter: blacklistedModels.get(cacheKey)?.blacklistedUntil
    }
  }
  
  try {
    const adapter = getAdapter(adapterKey)
    const healthResult = await adapter.healthCheck(modelRef)
    
    const result: ModelValidationResult = {
      isValid: healthResult.isHealthy,
      error: healthResult.error,
      lastChecked: new Date()
    }
    
    // Cache the result
    validationCache.set(cacheKey, result)
    
    // If validation failed, add to blacklist
    if (!result.isValid) {
      addToBlacklist(adapterKey, modelRef)
    }
    
    return result
  } catch (error) {
    const result: ModelValidationResult = {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown validation error",
      lastChecked: new Date()
    }
    
    // Cache and blacklist
    validationCache.set(cacheKey, result)
    addToBlacklist(adapterKey, modelRef)
    
    return result
  }
}

/**
 * Validate a model role and its fallbacks
 */
export async function validateModelRole(role: ModelRole): Promise<{
  isValid: boolean
  primaryValidation: ModelValidationResult
  fallbackValidations: Array<{ model: string; validation: ModelValidationResult }>
  errors: string[]
}> {
  const errors: string[] = []
  
  // Validate primary model
  const primaryValidation = await validateModelExistence(role.adapterKey, role.modelRef)
  if (!primaryValidation.isValid) {
    errors.push(`Primary model ${role.adapterKey}:${role.modelRef} failed: ${primaryValidation.error}`)
  }
  
  // Validate fallbacks
  const fallbackValidations = await Promise.all(
    role.fallbacks.map(async (fallback) => {
      const validation = await validateModelExistence(fallback.adapterKey, fallback.modelRef)
      if (!validation.isValid) {
        errors.push(`Fallback model ${fallback.adapterKey}:${fallback.modelRef} failed: ${validation.error}`)
      }
      return {
        model: `${fallback.adapterKey}:${fallback.modelRef}`,
        validation
      }
    })
  )
  
  return {
    isValid: primaryValidation.isValid && fallbackValidations.some(f => f.validation.isValid),
    primaryValidation,
    fallbackValidations,
    errors
  }
}

/**
 * Check if a model is currently blacklisted
 */
export function isModelBlacklisted(adapterKey: string, modelRef: string): boolean {
  return isBlacklisted(adapterKey, modelRef)
}

/**
 * Get validation statistics for monitoring
 */
export function getValidationStats(): {
  cacheSize: number
  blacklistedCount: number
  blacklistedModels: Array<{ model: string; failureCount: number; blacklistedUntil: Date }>
} {
  const blacklistedModelsList = Array.from(blacklistedModels.entries()).map(([key, data]) => ({
    model: key,
    failureCount: data.failureCount,
    blacklistedUntil: data.blacklistedUntil
  }))
  
  return {
    cacheSize: validationCache.size,
    blacklistedCount: blacklistedModels.size,
    blacklistedModels: blacklistedModelsList
  }
}

/**
 * Clear validation cache and blacklist (for testing or manual reset)
 */
export function clearValidationCache(): void {
  validationCache.clear()
  blacklistedModels.clear()
}

/**
 * Remove a model from blacklist (manual override)
 */
export function unblacklistModel(adapterKey: string, modelRef: string): void {
  const key = getCacheKey(adapterKey, modelRef)
  blacklistedModels.delete(key)
  validationCache.delete(key)
  console.log(`✅ Model ${key} removed from blacklist`)
}
