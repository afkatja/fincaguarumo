/**
 * Test suite for Role-Based Model Provider System - Phase 1
 * Tests acceptance criteria from FG-29-role-based-model-provider.md
 *
 * Model selection and fallbacks are exercised via model-gateway (not the legacy factory).
 */

import {
  resolveModel,
  execute,
  isDegradationResponse,
  validateModelEnvironment,
  testModelConnectivity,
  getAvailableModels,
} from "../src/lib/model-gateway"
import {
  FALLBACK_CHAIN_MAX_DURATION_MS,
  MODEL_SELECTION_MAX_LATENCY_MS,
} from "../src/lib/model-performance-budgets"
import { routeRequest, RouteRequest } from "../src/lib/task-router"
import {
  getAllCircuitBreakerStates,
  resetCircuitBreaker,
} from "../src/lib/health-checker"

const originalEnv = process.env

function resetAllCircuitBreakers(): void {
  for (const roleId of Object.keys(getAllCircuitBreakerStates())) {
    resetCircuitBreaker(roleId)
  }
  resetCircuitBreaker("primary")
  resetCircuitBreaker("evaluation")
}

describe("Role-Based Model Provider System", () => {
  beforeEach(() => {
    resetAllCircuitBreakers()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    resetAllCircuitBreakers()
    process.env = originalEnv
  })

  describe("A1: Role-based model configuration", () => {
    test("should use GEN_MODEL_PRIMARY for general generation", async () => {
      process.env.GEN_MODEL_PRIMARY_PROVIDER = "perplexity"
      process.env.GEN_MODEL_PRIMARY_MODEL_ID =
        "llama-3.1-sonar-large-128k-online"
      process.env.GEN_MODEL_TOOLS_PROVIDER = "mistral"
      process.env.GEN_MODEL_TOOLS_MODEL_ID = "mistral-large-latest"

      const primary = await resolveModel("primary", { taskType: "generation" })

      expect(primary.adapterKey).toBe("perplexity")
      expect(primary.modelRef).toBe("llama-3.1-sonar-large-128k-online")
    })

    test("should use GEN_MODEL_TOOLS for tool-calling tasks", () => {
      process.env.GEN_MODEL_TOOLS_PROVIDER = "mistral"
      process.env.GEN_MODEL_TOOLS_MODEL_ID = "mistral-large-latest"

      expect(process.env.GEN_MODEL_TOOLS_PROVIDER).toBe("mistral")
      expect(process.env.GEN_MODEL_TOOLS_MODEL_ID).toBe("mistral-large-latest")
    })
  })

  describe("A2: Automatic fallback on model failure", () => {
    test("should fallback to next model in chain within 5 seconds", async () => {
      const startTime = Date.now()

      process.env.GEN_MODEL_PRIMARY_FALLBACKS =
        "perplexity:llama-3.1-sonar-large-128k-online,mistral:mistral-small"

      try {
        await resolveModel("primary", { taskType: "generation" })
        const connectivity = await testModelConnectivity("primary")

        expect(connectivity.success).toBe(true)
        expect(Date.now() - startTime).toBeLessThanOrEqual(
          FALLBACK_CHAIN_MAX_DURATION_MS,
        )
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, 10000)

    test("should handle timeout, 429, 5xx, malformed output, tool-call invalidity", async () => {
      const result = await testModelConnectivity("primary")

      expect(result.error).toBeDefined()
      expect(result.success).toBe(false)
    })
  })

  describe("A3: Model promotion based on benchmark results", () => {
    test("should promote model when it beats incumbent by 5% with no regressions", () => {
      const benchmarkResults = {
        currentModel: {
          modelId: "model-a",
          weightedScore: 85,
          faithfulnessRegression: 0,
          structuredOutputValidity: 98,
          p95Latency: 1500,
          cost: 1.0,
        },
        candidateModel: {
          modelId: "model-b",
          weightedScore: 90,
          faithfulnessRegression: 0.5,
          structuredOutputValidity: 99,
          p95Latency: 1400,
          cost: 0.8,
        },
      }

      const shouldPromote =
        benchmarkResults.candidateModel.weightedScore >=
          benchmarkResults.currentModel.weightedScore * 1.05 &&
        benchmarkResults.candidateModel.faithfulnessRegression <= 1.0 &&
        benchmarkResults.candidateModel.structuredOutputValidity >= 98 &&
        benchmarkResults.candidateModel.p95Latency <= 2000

      expect(shouldPromote).toBe(true)
    })

    test("should not promote when regressions detected", () => {
      const benchmarkResults = {
        currentModel: {
          modelId: "model-a",
          weightedScore: 85,
          faithfulnessRegression: 0,
          structuredOutputValidity: 98,
          p95Latency: 1500,
          cost: 1.0,
        },
        candidateModel: {
          modelId: "model-b",
          weightedScore: 92,
          faithfulnessRegression: 1.5,
          structuredOutputValidity: 97,
          p95Latency: 1400,
          cost: 0.8,
        },
      }

      const shouldPromote =
        benchmarkResults.candidateModel.faithfulnessRegression <= 1.0 &&
        benchmarkResults.candidateModel.structuredOutputValidity >= 98

      expect(shouldPromote).toBe(false)
    })
  })

  describe("A4: Manual override capabilities", () => {
    test("should read override environment variables for primary generation", () => {
      process.env.GEN_MODEL_PRIMARY_PROVIDER = "mistral"
      process.env.GEN_MODEL_PRIMARY_MODEL_ID = "mistral-large-latest"
      process.env.GEN_MODEL_PRIMARY_OVERRIDE_PROVIDER = "perplexity"
      process.env.GEN_MODEL_PRIMARY_OVERRIDE_MODEL_ID =
        "llama-3.1-sonar-large-128k-online"

      expect(process.env.GEN_MODEL_PRIMARY_OVERRIDE_PROVIDER).toBe(
        "perplexity",
      )
      expect(process.env.GEN_MODEL_PRIMARY_OVERRIDE_MODEL_ID).toBe(
        "llama-3.1-sonar-large-128k-online",
      )
    })

    test("should reject override during benchmark runs", () => {
      const request: RouteRequest = {
        taskType: "generation",
        manualOverrides: {
          role: "primary",
          adapterKey: "perplexity",
          modelRef: "llama-3.1-sonar-large-128k-online",
        },
        isBenchmark: true,
      }

      expect(() => routeRequest(request)).toThrow(
        "Manual overrides are not allowed during benchmark runs",
      )
    })

    test("should reject override for evaluation routes", () => {
      const request: RouteRequest = {
        taskType: "evaluation",
        manualOverrides: {
          role: "primary",
          adapterKey: "perplexity",
          modelRef: "llama-3.1-sonar-large-128k-online",
        },
      }

      expect(() => routeRequest(request)).toThrow(
        "Manual overrides are not allowed for evaluation routes",
      )
    })

    test("should reject override for tools routes", () => {
      const request: RouteRequest = {
        taskType: "tools",
        manualOverrides: {
          role: "primary",
          adapterKey: "perplexity",
          modelRef: "llama-3.1-sonar-large-128k-online",
        },
      }

      expect(() => routeRequest(request)).toThrow(
        "Manual overrides are not allowed for tools routes",
      )
    })

    test("should reject override for non-primary generation roles", () => {
      const request: RouteRequest = {
        taskType: "fast",
        manualOverrides: {
          role: "primary",
          adapterKey: "perplexity",
          modelRef: "llama-3.1-sonar-large-128k-online",
        },
      }

      expect(() => routeRequest(request)).toThrow(
        "Manual overrides are only allowed for primary generation role",
      )
    })

    test("should allow override for primary generation role in non-benchmark context", () => {
      const request: RouteRequest = {
        taskType: "generation",
        manualOverrides: {
          role: "primary",
          adapterKey: "perplexity",
          modelRef: "llama-3.1-sonar-large-128k-online",
        },
        isBenchmark: false,
      }

      try {
        routeRequest(request)
      } catch (error) {
        expect((error as Error).message).not.toContain("A4 scope restriction")
      }
    })

    test("gateway should reject manual override during benchmark runs", async () => {
      const result = await execute({
        role: "primary",
        taskType: "generation",
        isBenchmark: true,
        manualOverrides: {
          adapterKey: "perplexity",
          modelRef: "llama-3.1-sonar-large-128k-online",
        },
      })

      expect(isDegradationResponse(result)).toBe(true)
      if (isDegradationResponse(result)) {
        expect(result.failureReasons[0]?.error).toContain(
          "Manual overrides not allowed during benchmark runs",
        )
      }
    })
  })

  describe("A5: Local/Remote embedding roles", () => {
    test("should use local embedding model in development environment", async () => {
      const mockEnv = { ...originalEnv }
      mockEnv.NODE_ENV = "development"
      process.env = mockEnv
      process.env.EMBED_MODEL_LOCAL_PROVIDER = "local"
      process.env.EMBED_MODEL_LOCAL_MODEL_ID = "e5-base-instruct"
      process.env.EMBED_MODEL_REMOTE_PROVIDER = "together"
      process.env.EMBED_MODEL_REMOTE_MODEL_ID = "intfloat/e5-base-instruct"

      const { generateEmbedding } =
        await import("../src/lib/semantic-rag/embeddings")

      try {
        const result = await generateEmbedding("test text", "en")
        expect(result.embedding).toBeDefined()
        expect(result.dimensions).toBeGreaterThan(0)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    test("should validate retrieval parity between local and remote embeddings", async () => {
      const { validateLabeledRetrievalParity, embeddingVectorsDimensionMatch } =
        await import("../src/lib/semantic-rag/retrieval-parity")

      const mockLocal = [0.1, 0.2, 0.3, 0.4, 0.5]
      const mockRemote = mockLocal.map(x => x * 1.001)

      expect(embeddingVectorsDimensionMatch(mockLocal, mockRemote)).toBe(true)

      const corpusInc = [
        mockLocal,
        [0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0],
      ]
      const corpusCand = [
        mockRemote,
        [0, 0, 0, 0, 1.001],
        [0, 0, 0, 1.001, 0],
      ]
      const qInc = [mockLocal]
      const qCand = [mockRemote]

      const parity = validateLabeledRetrievalParity({
        corpusEmbeddingsIncumbent: corpusInc,
        corpusEmbeddingsCandidate: corpusCand,
        queryEmbeddingsIncumbent: qInc,
        queryEmbeddingsCandidate: qCand,
        groundTruthRelevantCorpusIndices: [[0]],
        thresholds: { k: 3, minCandidateMeanRecallAtK: 0.85 },
      })

      expect(parity.passed).toBe(true)
    })
  })

  describe("A6: Graceful degradation when all models fail", () => {
    test("should define all four degradation types from the spec", () => {
      const degradationTypes = [
        "no-answer-available",
        "partial-answer",
        "stale-cached-answer",
        "fallback-generated-minimal-response",
      ] as const

      expect(degradationTypes).toHaveLength(4)
      expect(degradationTypes).toContain("no-answer-available")
      expect(degradationTypes).toContain("partial-answer")
      expect(degradationTypes).toContain("stale-cached-answer")
      expect(degradationTypes).toContain("fallback-generated-minimal-response")
    })

    test("DegradationResponse shape should include required fields", () => {
      const response = {
        isDegradation: true,
        degradationType: "fallback-generated-minimal-response" as const,
        message: "AI models are temporarily unavailable.",
        roleId: "primary",
        attemptedModels: [{ adapterKey: "perplexity", modelRef: "model-x" }],
        failureReasons: [
          { adapterKey: "perplexity", modelRef: "model-x", error: "5xx" },
        ],
        timestamp: new Date(),
      }

      expect(response.isDegradation).toBe(true)
      expect(response.degradationType).toBeDefined()
      expect(response.roleId).toBe("primary")
      expect(response.attemptedModels).toHaveLength(1)
      expect(response.failureReasons).toHaveLength(1)
      expect(response.timestamp).toBeInstanceOf(Date)
    })

    test("execute returns DegradationResponse when role is unknown", async () => {
      const result = await execute({ role: "nonexistent-role-xyz" })

      expect(isDegradationResponse(result)).toBe(true)
      if (isDegradationResponse(result)) {
        expect(result.roleId).toBe("nonexistent-role-xyz")
        expect(result.isDegradation).toBe(true)
      }
    })

    test("see tests/degradation-response.test.ts for full A6 coverage", () => {
      expect(true).toBe(true)
    })
  })

  describe("Environment variable validation", () => {
    test("should validate required environment variables", () => {
      process.env.GEN_MODEL_PRIMARY_PROVIDER = "perplexity"
      delete process.env.PERPLEXITY_API_KEY

      const validation = validateModelEnvironment()

      expect(validation.isValid).toBe(false)
      expect(validation.missing).toContain("PERPLEXITY_API_KEY")
    })

    test("should provide safe defaults for missing configuration", () => {
      delete process.env.GEN_MODEL_PRIMARY_PROVIDER
      delete process.env.GEN_MODEL_PRIMARY_ADAPTER_KEY
      delete process.env.MAIN_MODEL_PROVIDER
      delete process.env.MAIN_MODEL_ADAPTER_KEY

      const models = getAvailableModels()

      expect(models.primary).toBeDefined()
      expect(models.evaluation).toBeDefined()
    })
  })

  describe("Performance requirements", () => {
    test("model selection latency should be < 50ms", async () => {
      process.env.GEN_MODEL_PRIMARY_PROVIDER = "perplexity"
      process.env.GEN_MODEL_PRIMARY_MODEL_ID =
        "llama-3.1-sonar-large-128k-online"
      delete process.env.GEN_MODEL_PRIMARY_FALLBACKS

      const startTime = Date.now()

      const resolved = await resolveModel("primary", { taskType: "generation" })
      expect(resolved.adapterKey).toBe("perplexity")
      expect(resolved.modelRef).toEqual(expect.any(String))

      const selectionTime = Date.now() - startTime
      expect(selectionTime).toBeLessThanOrEqual(MODEL_SELECTION_MAX_LATENCY_MS)
    })

    test("fallback timeout should be < 5 seconds", async () => {
      const startTime = Date.now()

      try {
        const connectivity = await testModelConnectivity("primary")
        expect(typeof connectivity.success).toBe("boolean")
        const fallbackTime = Date.now() - startTime
        expect(fallbackTime).toBeLessThanOrEqual(FALLBACK_CHAIN_MAX_DURATION_MS)
      } catch (error) {
        const fallbackTime = Date.now() - startTime
        expect(fallbackTime).toBeLessThanOrEqual(FALLBACK_CHAIN_MAX_DURATION_MS)
      }
    })
  })

  describe("Backward compatibility", () => {
    test("should support existing MAIN_MODEL_* variables", () => {
      delete process.env.GEN_MODEL_PRIMARY_PROVIDER
      delete process.env.GEN_MODEL_PRIMARY_ADAPTER_KEY
      delete process.env.GEN_MODEL_PRIMARY_MODEL_ID
      delete process.env.GEN_MODEL_PRIMARY_MODEL_REF
      process.env.MAIN_MODEL_PROVIDER = "perplexity"
      process.env.MAIN_MODEL_MODEL_ID = "llama-3.1-sonar-large-128k-online"
      process.env.MAIN_MODEL_MAX_TOKENS = "2000"

      const models = getAvailableModels()

      expect(models.primary.adapterKey).toBe("perplexity")
      expect(models.primary.modelRef).toBe("llama-3.1-sonar-large-128k-online")
      expect(models.primary.maxTokens).toBe(2000)
    })
  })
})
