import { QdrantClient } from "@qdrant/js-client-rest"
import { generateEmbedding } from "./embeddings"
import { initializeQdrantCollection, storeEmbedding } from "./qdrant-store"

// Benchmark configuration
const BENCHMARK_CONFIG = {
  // Test data sizes
  testSizes: [100, 500, 1000, 5000],

  // Vector dimensions (e5-base-instruct)
  vectorDimensions: 768,

  // Number of test runs for each configuration
  testRuns: 3,

  // Search parameters
  searchK: 10,
  searchThreshold: 0.7,

  // Performance thresholds (in milliseconds)
  maxIndexingTime: 10000, // 10 seconds per 1000 vectors
  maxSearchTime: 1000, // 1 second per search
  maxMemoryUsage: 500, // 500MB

  // Binary quantization effectiveness thresholds
  minCompressionRatio: 0.5, // Should compress by at least 50%
  maxSearchQualityLoss: 0.1, // Search quality should not degrade by more than 10%
}

export interface BenchmarkResult {
  testSize: number
  configuration: string
  indexingTimeMs: number
  indexSizeMB: number
  isEstimated: boolean
  searchTimeMs: number
  searchAccuracy: number
  compressionRatio: number
  memoryUsageMB: number
  throughputVectorsPerSecond: number
}

export interface BenchmarkSummary {
  results: BenchmarkResult[]
  averageIndexingTime: number
  averageSearchTime: number
  averageCompressionRatio: number
  averageSearchAccuracy: number
  recommendations: string[]
}

/**
 * Generate test embeddings for benchmarking
 */
async function generateTestEmbeddings(count: number): Promise<
  Array<{
    id: string
    content: string
    label: string
    embedding: number[]
  }>
> {
  const embeddings = []
  const categories = [
    "technology",
    "science",
    "business",
    "health",
    "education",
    "entertainment",
    "sports",
    "politics",
    "travel",
    "food",
  ]

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length]
    const content = `${category} content for benchmarking item ${i}. This is sample text about ${category} for performance testing and evaluation.`

    try {
      const result = await generateEmbedding(content, "en")
      embeddings.push({
        id: `test_${i}`,
        content,
        label: category,
        embedding: result.embedding,
      })
    } catch (error) {
      console.error(`Failed to generate embedding for test item ${i}:`, error)
      // Use a mock embedding for testing
      embeddings.push({
        id: `test_${i}`,
        content,
        label: category,
        embedding: Array.from(
          { length: BENCHMARK_CONFIG.vectorDimensions },
          () => Math.random() - 0.5,
        ),
      })
    }
  }

  return embeddings
}

/**
 * Measure memory usage
 */
function getMemoryUsage(): number {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage()
    return usage.heapUsed / 1024 / 1024 // Convert to MB
  }

  // Fallback for browser environments
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    return memory.usedJSHeapSize / 1024 / 1024
  }

  return 0
}

/**
 * Benchmark indexing performance with and without binary quantization
 */
async function benchmarkIndexing(
  embeddings: Array<{
    id: string
    content: string
    label: string
    embedding: number[]
  }>,
  useBinaryQuantization: boolean,
): Promise<{
  indexingTimeMs: number
  indexSizeMB: number
  isEstimated: boolean
  memoryUsageMB: number
}> {
  const testSize = embeddings.length
  const startTime = Date.now()
  const startMemory = getMemoryUsage()

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const collectionName = useBinaryQuantization
    ? `benchmark_binary_${testSize}_${uniqueSuffix}`
    : `benchmark_standard_${testSize}_${uniqueSuffix}`

  // Initialize collection
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333"
  const qdrantApiKey = process.env.QDRANT_API_KEY
  const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    ...(qdrantApiKey && { apiKey: qdrantApiKey }),
  })

  try {
    // Create collection with or without binary quantization
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: BENCHMARK_CONFIG.vectorDimensions,
        distance: "Cosine",
      },
      ...(useBinaryQuantization && {
        quantization_config: {
          binary: {
            always_ram: true,
          },
        },
      }),
    })

    // Index embeddings
    console.log(
      `Indexing ${testSize} embeddings with${useBinaryQuantization ? "" : "out"} binary quantization...`,
    )

    const points = embeddings.map((embedding, index) => ({
      id: index,
      vector: embedding.embedding,
      payload: {
        content: embedding.content,
        label: embedding.label,
        content_type: "benchmark",
        language: "en",
        content_id: embedding.id,
      },
    }))

    // Batch insert (Qdrant can handle up to 1000 points per request)
    const batchSize = 1000
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      await qdrantClient.upsert(collectionName, {
        points: batch,
      })
    }

    const endTime = Date.now()
    const endMemory = getMemoryUsage()

    // Get collection info to estimate size
    const collectionInfo = await qdrantClient.getCollection(collectionName)
    const indexSizeResult = estimateIndexSize(collectionInfo, testSize)

    return {
      indexingTimeMs: endTime - startTime,
      indexSizeMB: indexSizeResult.sizeMB,
      isEstimated: indexSizeResult.isEstimated,
      memoryUsageMB: endMemory - startMemory,
    }
  } catch (error) {
    console.error(`Indexing benchmark failed for size ${testSize}:`, error)
    throw error
  } finally {
    // Clean up - always run regardless of errors
    try {
      await qdrantClient.deleteCollection(collectionName)
    } catch (cleanupError) {
      console.warn(
        `Failed to clean up collection ${collectionName}:`,
        cleanupError,
      )
    }
  }
}

/**
 * Estimate collection size based on Qdrant metadata
 * Returns real size if available, otherwise returns estimated size with isEstimated flag
 */
function estimateIndexSize(
  collectionInfo: any,
  vectorCount: number,
): {
  sizeMB: number
  isEstimated: boolean
} {
  // Try to get real storage size from collection metadata
  // Qdrant may provide storage info in different fields depending on version
  const realStorageBytes =
    collectionInfo.storage_bytes ||
    collectionInfo.disk_usage_bytes ||
    collectionInfo.payload_storage_bytes ||
    collectionInfo.vectors_storage_bytes

  if (realStorageBytes && typeof realStorageBytes === "number") {
    return {
      sizeMB: realStorageBytes / 1024 / 1024, // Convert to MB
      isEstimated: false,
    }
  }

  // Fallback to estimation when real storage data is not available
  console.warn("Real storage size not available, using estimation")
  const vectorSizeBytes = BENCHMARK_CONFIG.vectorDimensions * 4 // 4 bytes per float
  const estimatedSize = vectorCount * vectorSizeBytes

  return {
    sizeMB: estimatedSize / 1024 / 1024, // Convert to MB
    isEstimated: true,
  }
}

/**
 * Benchmark search performance
 */
async function benchmarkSearch(
  embeddings: Array<{
    id: string
    content: string
    label: string
    embedding: number[]
  }>,
  useBinaryQuantization: boolean,
): Promise<{
  searchTimeMs: number
  searchAccuracy: number
}> {
  const testSize = embeddings.length
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const collectionName = useBinaryQuantization
    ? `search_benchmark_binary_${testSize}_${uniqueSuffix}`
    : `search_benchmark_standard_${testSize}_${uniqueSuffix}`

  // Setup collection and data
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333"
  const qdrantApiKey = process.env.QDRANT_API_KEY
  const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    ...(qdrantApiKey && { apiKey: qdrantApiKey }),
  })

  try {
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: BENCHMARK_CONFIG.vectorDimensions,
        distance: "Cosine",
      },
      ...(useBinaryQuantization && {
        quantization_config: {
          binary: {
            always_ram: true,
          },
        },
      }),
    })

    // Index embeddings
    const points = embeddings.map((embedding, index) => ({
      id: index,
      vector: embedding.embedding,
      payload: {
        content: embedding.content,
        label: embedding.label,
        content_type: "benchmark",
        language: "en",
        content_id: embedding.id,
      },
    }))

    const batchSize = 1000
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      await qdrantClient.upsert(collectionName, {
        points: batch,
      })
    }

    // Perform search benchmarks
    const searchQueries = embeddings.slice(0, 10) // Test with first 10 embeddings
    const searchTimes: number[] = []
    let totalAccuracy = 0

    for (const query of searchQueries) {
      const searchStart = Date.now()

      const searchResult = await qdrantClient.search(collectionName, {
        vector: query.embedding,
        limit: BENCHMARK_CONFIG.searchK,
        score_threshold: BENCHMARK_CONFIG.searchThreshold,
      })

      const searchEnd = Date.now()
      searchTimes.push(searchEnd - searchStart)

      // Calculate accuracy (how many results are actually similar)
      const accuracy = calculateSearchAccuracy(query, searchResult)
      totalAccuracy += accuracy
    }

    const averageSearchTime =
      searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length
    const averageAccuracy = totalAccuracy / searchQueries.length

    return {
      searchTimeMs: averageSearchTime,
      searchAccuracy: averageAccuracy,
    }
  } catch (error) {
    console.error(`Search benchmark failed for size ${testSize}:`, error)
    throw error
  } finally {
    // Clean up - always run regardless of errors
    try {
      await qdrantClient.deleteCollection(collectionName)
    } catch (cleanupError) {
      console.warn(
        `Failed to clean up collection ${collectionName}:`,
        cleanupError,
      )
    }
  }
}

/**
 * Calculate search accuracy based on content similarity
 */
interface QueryEmbedding {
  id: string
  content: string
  label: string
  embedding: number[]
}

interface SearchResultPoint {
  id: string | number
  score?: number
  payload?:
    | Record<string, unknown>
    | {
        content?: string
        label?: string
        content_type?: string
        language?: string
        content_id?: string
        [key: string]: unknown
      }
    | null
}

function calculateSearchAccuracy(
  query: QueryEmbedding,
  results: SearchResultPoint[],
): number {
  if (results.length === 0) return 0

  // Count results with matching labels (recall@k calculation)
  const relevantResults = results.filter(result => {
    const resultLabel =
      result.payload &&
      typeof result.payload === "object" &&
      "label" in result.payload &&
      typeof result.payload.label === "string"
        ? result.payload.label
        : ""

    return resultLabel === query.label
  })

  // Calculate recall@k: relevant results / min(k, total possible relevant)
  const k = results.length
  const recallAtK = relevantResults.length / k

  return recallAtK
}

/**
 * Run comprehensive benchmarks for binary quantization
 */
export async function runBinaryQuantizationBenchmarks(): Promise<BenchmarkSummary> {
  console.log("Starting binary quantization benchmarks...")

  const results: BenchmarkResult[] = []

  for (const testSize of BENCHMARK_CONFIG.testSizes) {
    console.log(`\nBenchmarking test size: ${testSize}`)

    // Generate embeddings once for this test size
    console.log(`Generating ${testSize} test embeddings...`)
    const embeddings = await generateTestEmbeddings(testSize)

    // Test without binary quantization
    const standardIndexing = await benchmarkIndexing(embeddings, false)
    const standardSearch = await benchmarkSearch(embeddings, false)

    // Test with binary quantization
    const binaryIndexing = await benchmarkIndexing(embeddings, true)
    const binarySearch = await benchmarkSearch(embeddings, true)

    // Calculate metrics
    const compressionRatio =
      1 - binaryIndexing.indexSizeMB / standardIndexing.indexSizeMB
    const searchQualityLoss =
      (standardSearch.searchAccuracy - binarySearch.searchAccuracy) /
      standardSearch.searchAccuracy

    // Create result entries
    results.push({
      testSize,
      configuration: "standard",
      indexingTimeMs: standardIndexing.indexingTimeMs,
      indexSizeMB: standardIndexing.indexSizeMB,
      isEstimated: standardIndexing.isEstimated,
      searchTimeMs: standardSearch.searchTimeMs,
      searchAccuracy: standardSearch.searchAccuracy,
      compressionRatio: 0,
      memoryUsageMB: standardIndexing.memoryUsageMB,
      throughputVectorsPerSecond:
        testSize / (standardIndexing.indexingTimeMs / 1000),
    })

    results.push({
      testSize,
      configuration: "binary",
      indexingTimeMs: binaryIndexing.indexingTimeMs,
      indexSizeMB: binaryIndexing.indexSizeMB,
      isEstimated: binaryIndexing.isEstimated,
      searchTimeMs: binarySearch.searchTimeMs,
      searchAccuracy: binarySearch.searchAccuracy,
      compressionRatio,
      memoryUsageMB: binaryIndexing.memoryUsageMB,
      throughputVectorsPerSecond:
        testSize / (binaryIndexing.indexingTimeMs / 1000),
    })

    console.log(
      `Standard indexing: ${standardIndexing.indexingTimeMs}ms, ${standardIndexing.indexSizeMB}MB`,
    )
    console.log(
      `Binary indexing: ${binaryIndexing.indexingTimeMs}ms, ${binaryIndexing.indexSizeMB}MB`,
    )
    console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`)
    console.log(`Search quality loss: ${(searchQualityLoss * 100).toFixed(1)}%`)
  }

  // Calculate summary statistics
  const binaryResults = results.filter(r => r.configuration === "binary")
  const standardResults = results.filter(r => r.configuration === "standard")

  const summary: BenchmarkSummary = {
    results,
    averageIndexingTime:
      binaryResults.reduce((sum, r) => sum + r.indexingTimeMs, 0) /
      binaryResults.length,
    averageSearchTime:
      binaryResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
      binaryResults.length,
    averageCompressionRatio:
      binaryResults.reduce((sum, r) => sum + r.compressionRatio, 0) /
      binaryResults.length,
    averageSearchAccuracy:
      binaryResults.reduce((sum, r) => sum + r.searchAccuracy, 0) /
      binaryResults.length,
    recommendations: generateRecommendations(results),
  }

  console.log("\n=== BENCHMARK SUMMARY ===")
  console.log(
    `Average indexing time: ${summary.averageIndexingTime.toFixed(0)}ms`,
  )
  console.log(`Average search time: ${summary.averageSearchTime.toFixed(0)}ms`)
  console.log(
    `Average compression ratio: ${(summary.averageCompressionRatio * 100).toFixed(1)}%`,
  )
  console.log(
    `Average search accuracy: ${(summary.averageSearchAccuracy * 100).toFixed(1)}%`,
  )

  return summary
}

/**
 * Generate recommendations based on benchmark results
 */
function generateRecommendations(results: BenchmarkResult[]): string[] {
  const recommendations: string[] = []

  const binaryResults = results.filter(r => r.configuration === "binary")
  const standardResults = results.filter(r => r.configuration === "standard")

  // Analyze compression effectiveness
  const avgCompression =
    binaryResults.reduce((sum, r) => sum + r.compressionRatio, 0) /
    binaryResults.length

  // Check if any binary results use estimated sizes
  const hasEstimatedSizes = binaryResults.some(r => r.isEstimated)

  if (hasEstimatedSizes) {
    recommendations.push(
      `Compression ratio (${(avgCompression * 100).toFixed(1)}%) is based on estimated storage sizes - threshold recommendations skipped`,
    )
  } else {
    if (avgCompression < BENCHMARK_CONFIG.minCompressionRatio) {
      recommendations.push(
        `Binary quantization compression ratio (${(avgCompression * 100).toFixed(1)}%) is below threshold (${(BENCHMARK_CONFIG.minCompressionRatio * 100).toFixed(1)}%)`,
      )
    } else {
      recommendations.push(
        `Binary quantization provides good compression (${(avgCompression * 100).toFixed(1)}%)`,
      )
    }
  }

  // Analyze search performance
  const avgBinarySearchTime =
    binaryResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
    binaryResults.length
  const avgStandardSearchTime =
    standardResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
    standardResults.length

  if (avgBinarySearchTime < avgStandardSearchTime) {
    recommendations.push(
      `Binary quantization improves search speed by ${(((avgStandardSearchTime - avgBinarySearchTime) / avgStandardSearchTime) * 100).toFixed(1)}%`,
    )
  } else {
    recommendations.push(
      `Binary quantization does not improve search speed (consider investigating configuration)`,
    )
  }

  // Analyze search quality
  const avgBinaryAccuracy =
    binaryResults.reduce((sum, r) => sum + r.searchAccuracy, 0) /
    binaryResults.length
  const avgStandardAccuracy =
    standardResults.reduce((sum, r) => sum + r.searchAccuracy, 0) /
    standardResults.length
  const qualityLoss =
    (avgStandardAccuracy - avgBinaryAccuracy) / avgStandardAccuracy

  if (qualityLoss > BENCHMARK_CONFIG.maxSearchQualityLoss) {
    recommendations.push(
      `Search quality loss (${(qualityLoss * 100).toFixed(1)}%) exceeds threshold (${(BENCHMARK_CONFIG.maxSearchQualityLoss * 100).toFixed(1)}%)`,
    )
  } else {
    recommendations.push(
      `Search quality loss is acceptable (${(qualityLoss * 100).toFixed(1)}%)`,
    )
  }

  // Memory usage analysis
  const avgBinaryMemory =
    binaryResults.reduce((sum, r) => sum + r.memoryUsageMB, 0) /
    binaryResults.length
  if (avgBinaryMemory > BENCHMARK_CONFIG.maxMemoryUsage) {
    recommendations.push(
      `Memory usage (${avgBinaryMemory.toFixed(1)}MB) exceeds threshold (${BENCHMARK_CONFIG.maxMemoryUsage}MB)`,
    )
  }

  return recommendations
}

/**
 * Export benchmark results to JSON for analysis
 */
export function exportBenchmarkResults(summary: BenchmarkSummary): string {
  return JSON.stringify(summary, null, 2)
}

/**
 * Compare benchmark results with previous runs
 */
export function compareBenchmarkResults(
  current: BenchmarkSummary,
  previous: BenchmarkSummary,
): {
  improvements: string[]
  regressions: string[]
  summary: string
} {
  const improvements: string[] = []
  const regressions: string[] = []

  // Compare indexing time
  const indexingImprovement =
    (previous.averageIndexingTime - current.averageIndexingTime) /
    previous.averageIndexingTime
  if (Math.abs(indexingImprovement) > 0.05) {
    // 5% threshold
    if (indexingImprovement > 0) {
      improvements.push(
        `Indexing time improved by ${(indexingImprovement * 100).toFixed(1)}%`,
      )
    } else {
      regressions.push(
        `Indexing time degraded by ${(-indexingImprovement * 100).toFixed(1)}%`,
      )
    }
  }

  // Compare search time
  const searchImprovement =
    (previous.averageSearchTime - current.averageSearchTime) /
    previous.averageSearchTime
  if (Math.abs(searchImprovement) > 0.05) {
    if (searchImprovement > 0) {
      improvements.push(
        `Search time improved by ${(searchImprovement * 100).toFixed(1)}%`,
      )
    } else {
      regressions.push(
        `Search time degraded by ${(-searchImprovement * 100).toFixed(1)}%`,
      )
    }
  }

  // Compare compression ratio
  const compressionChange =
    current.averageCompressionRatio - previous.averageCompressionRatio
  if (Math.abs(compressionChange) > 0.05) {
    if (compressionChange > 0) {
      improvements.push(
        `Compression ratio improved by ${(compressionChange * 100).toFixed(1)}%`,
      )
    } else {
      regressions.push(
        `Compression ratio degraded by ${(-compressionChange * 100).toFixed(1)}%`,
      )
    }
  }

  const summary = `Found ${improvements.length} improvements and ${regressions.length} regressions compared to previous benchmark.`

  return { improvements, regressions, summary }
}
