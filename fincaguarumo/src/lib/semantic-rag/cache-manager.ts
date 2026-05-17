/**
 * Semantic RAG Cache Manager
 * 
 * Provides deduplication and caching for expensive operations:
 * - Intent embeddings (generated once per process)
 * - Query embeddings (cached with TTL)
 * - Semantic search results (cached with TTL)
 * - Context building results (cached with TTL)
 */

import { generateEmbedding } from "./embeddings"
import { semanticSearch } from "./vector-store-adapter"

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = {
  QUERY_EMBEDDING: 5 * 60 * 1000, // 5 minutes
  SEMANTIC_SEARCH: 2 * 60 * 1000, // 2 minutes
  CONTEXT_BUILDING: 1 * 60 * 1000, // 1 minute
}

// ---------------------------------------------------------------------------
// In-memory caches with TTL
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>()

  set(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    })
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Cache instances
// ---------------------------------------------------------------------------

const queryEmbeddingCache = new TTLCache<number[]>()
const semanticSearchCache = new TTLCache<any[]>()
const contextBuildingCache = new TTLCache<any>()

// ---------------------------------------------------------------------------
// Cache key generators
// ---------------------------------------------------------------------------

function generateQueryEmbeddingKey(query: string, language: string): string {
  return `query_embedding:${language}:${query.toLowerCase().trim()}`
}

function generateSemanticSearchKey(query: string, options: any): string {
  const optionsStr = JSON.stringify(options)
  return `semantic_search:${query.toLowerCase().trim()}:${optionsStr}`
}

function generateContextBuildingKey(query: string, pageContext: any, options: any): string {
  const contextStr = JSON.stringify(pageContext)
  const optionsStr = JSON.stringify(options)
  return `context:${query.toLowerCase().trim()}:${contextStr}:${optionsStr}`
}

// ---------------------------------------------------------------------------
// Cache utilities
// ---------------------------------------------------------------------------

/**
 * Generate query embedding with caching
 */
export async function getCachedQueryEmbedding(
  query: string,
  language: string = "en"
): Promise<number[]> {
  const key = generateQueryEmbeddingKey(query, language)
  
  let embedding = queryEmbeddingCache.get(key)
  if (embedding) {
    return embedding
  }

  // Generate new embedding
  const result = await generateEmbedding(query, language)
  embedding = result.embedding
  
  // Cache with TTL
  queryEmbeddingCache.set(key, embedding, CACHE_TTL_MS.QUERY_EMBEDDING)
  
  return embedding
}

/**
 * Perform semantic search with caching
 */
export async function getCachedSemanticSearch(
  query: string,
  options: any = {}
): Promise<any[]> {
  const key = generateSemanticSearchKey(query, options)
  
  let results = semanticSearchCache.get(key)
  if (results) {
    return results
  }

  // Perform new search
  results = await semanticSearch(query, options)
  
  // Cache with TTL
  semanticSearchCache.set(key, results, CACHE_TTL_MS.SEMANTIC_SEARCH)
  
  return results
}

/**
 * Build context with caching
 */
export async function getCachedContext(
  query: string,
  pageContext: any,
  options: any = {},
  contextBuilder: () => Promise<any>
): Promise<any> {
  const key = generateContextBuildingKey(query, pageContext, options)
  
  let result = contextBuildingCache.get(key)
  if (result) {
    return result
  }

  // Build new context
  result = await contextBuilder()
  
  // Cache with TTL
  contextBuildingCache.set(key, result, CACHE_TTL_MS.CONTEXT_BUILDING)
  
  return result
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    queryEmbeddings: {
      size: queryEmbeddingCache.size(),
      ttl: CACHE_TTL_MS.QUERY_EMBEDDING,
    },
    semanticSearch: {
      size: semanticSearchCache.size(),
      ttl: CACHE_TTL_MS.SEMANTIC_SEARCH,
    },
    contextBuilding: {
      size: contextBuildingCache.size(),
      ttl: CACHE_TTL_MS.CONTEXT_BUILDING,
    },
  }
}

/**
 * Clear all caches (useful for testing or manual reset)
 */
export function clearAllCaches(): void {
  queryEmbeddingCache.clear()
  semanticSearchCache.clear()
  contextBuildingCache.clear()
}

/**
 * Cleanup expired entries (call periodically)
 */
export function cleanupCaches(): void {
  queryEmbeddingCache.cleanup()
  semanticSearchCache.cleanup()
  contextBuildingCache.cleanup()
}

/**
 * Prevent duplicate operations with deduplication map
 */
class DeduplicationManager {
  private pending = new Map<string, Promise<any>>()

  async deduplicate<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if operation is already in progress
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>
    }

    // Create new operation promise
    const promise = operation()
    
    // Store in pending map
    this.pending.set(key, promise)

    try {
      const result = await promise
      return result
    } finally {
      // Clean up regardless of success/failure
      this.pending.delete(key)
    }
  }
}

export const deduplicationManager = new DeduplicationManager()

/**
 * Generate deduplication key for operations
 */
export function generateDeduplicationKey(
  operation: string,
  ...params: (string | number)[]
): string {
  return `${operation}:${params.join(":")}`
}
