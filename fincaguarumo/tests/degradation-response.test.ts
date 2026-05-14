/**
 * A6: Graceful degradation tests
 *
 * Tests the DegradationResponse type system and classification logic from
 * FG-29-role-based-model-provider.md acceptance criterion A6:
 *
 * "Given all models in a role are unavailable, when a request arrives, then
 * the system returns a typed graceful degradation response distinguishing
 * between no answer available, partial answer, stale cached answer, and
 * fallback-generated minimal response."
 *
 * This test file imports ONLY the degradation-specific exports to avoid the
 * transitive adapter-registry import that pulls in @ai-sdk/perplexity
 * (which requires TransformStream / Web Streams API not available in jsdom).
 */

import {
  classifyDegradationType,
  createDegradationResponse,
  isDegradationResponse,
  cacheEvaluationData,
  clearEvaluationCache,
  type DegradationResponse,
  type DegradationType,
} from "../src/lib/degradation-response"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv }
  clearEvaluationCache()
})

afterEach(() => {
  process.env = originalEnv
  clearEvaluationCache()
})

// ===========================================================================
// classifyDegradationType
// ===========================================================================

describe("A6: classifyDegradationType", () => {
  test("should return 'stale-cached-answer' when evaluation cache has data for the role", () => {
    // Seed the evaluation cache for the "evaluation" role
    cacheEvaluationData("evaluation", {
      result: { score: 0.85, label: "good" },
      timestamp: Date.now(),
    })

    const type = classifyDegradationType("evaluation", [
      {
        adapterKey: "mistral",
        modelRef: "mistral-large-latest",
        error: "timeout",
      },
    ])

    expect(type).toBe("stale-cached-answer")
  })

  test("should return 'partial-answer' when partial content is provided", () => {
    const type = classifyDegradationType(
      "primary",
      [
        {
          adapterKey: "mistral",
          modelRef: "mistral-large-latest",
          error: "truncated",
        },
      ],
      "Here is a partial response...",
    )

    expect(type).toBe("partial-answer")
  })

  test("should return 'fallback-generated-minimal-response' for generation-capable roles with no cache or partial content", () => {
    // "primary" has generation=true in its declared capabilities
    const type = classifyDegradationType("primary", [
      {
        adapterKey: "perplexity",
        modelRef: "llama-3.1-sonar-large-128k-online",
        error: "5xx",
      },
    ])

    expect(type).toBe("fallback-generated-minimal-response")
  })

  test("should return 'no-answer-available' for embedding-only roles with no cache", () => {
    // "embedding-local" has generation=false, toolCalling=false
    const type = classifyDegradationType("embedding-local", [
      {
        adapterKey: "local",
        modelRef: "e5-base-instruct",
        error: "unavailable",
      },
    ])

    expect(type).toBe("no-answer-available")
  })

  test("should prefer stale-cached-answer over partial-answer", () => {
    // Seed cache AND provide partial content — cache wins
    cacheEvaluationData("evaluation", {
      result: "cached evaluation result",
      timestamp: Date.now(),
    })

    const type = classifyDegradationType(
      "evaluation",
      [
        {
          adapterKey: "mistral",
          modelRef: "mistral-large-latest",
          error: "timeout",
        },
      ],
      "partial content here",
    )

    expect(type).toBe("stale-cached-answer")
  })

  test("should prefer partial-answer over fallback-generated-minimal-response", () => {
    // "primary" has generation=true, but partial content takes precedence
    const type = classifyDegradationType(
      "primary",
      [
        {
          adapterKey: "perplexity",
          modelRef: "model-x",
          error: "truncated",
        },
      ],
      "  some partial text  ",
    )

    expect(type).toBe("partial-answer")
  })

  test("should return 'no-answer-available' for unknown role with no cache and no partial content", () => {
    const type = classifyDegradationType("nonexistent-role", [
      {
        adapterKey: "unknown",
        modelRef: "unknown-model",
        error: "not found",
      },
    ])

    expect(type).toBe("no-answer-available")
  })
})

// ===========================================================================
// createDegradationResponse
// ===========================================================================

describe("A6: createDegradationResponse", () => {
  test("should create a well-formed DegradationResponse for generation role", () => {
    const attemptedModels = [
      {
        adapterKey: "perplexity",
        modelRef: "llama-3.1-sonar-large-128k-online",
      },
      { adapterKey: "mistral", modelRef: "mistral-small" },
    ]
    const failureReasons = [
      {
        adapterKey: "perplexity",
        modelRef: "llama-3.1-sonar-large-128k-online",
        error: "5xx",
      },
      {
        adapterKey: "mistral",
        modelRef: "mistral-small",
        error: "timeout",
      },
    ]

    const response = createDegradationResponse(
      "primary",
      attemptedModels,
      failureReasons,
    )

    expect(response.isDegradation).toBe(true)
    expect(response.degradationType).toBe("fallback-generated-minimal-response")
    expect(response.roleId).toBe("primary")
    expect(response.attemptedModels).toEqual(attemptedModels)
    expect(response.failureReasons).toEqual(failureReasons)
    expect(response.message).toContain("primary")
    expect(response.timestamp).toBeInstanceOf(Date)
  })

  test("should include partialContent for partial-answer degradation", () => {
    const response = createDegradationResponse(
      "primary",
      [{ adapterKey: "perplexity", modelRef: "model-x" }],
      [{ adapterKey: "perplexity", modelRef: "model-x", error: "truncated" }],
      "Partial AI response text",
    )

    expect(response.degradationType).toBe("partial-answer")
    expect(response.partialContent).toBe("Partial AI response text")
  })

  test("should include partialContent from cache for stale-cached-answer degradation", () => {
    cacheEvaluationData("evaluation", {
      result: { score: 0.92, label: "excellent" },
      timestamp: Date.now(),
    })

    const response = createDegradationResponse(
      "evaluation",
      [{ adapterKey: "mistral", modelRef: "mistral-large-latest" }],
      [
        {
          adapterKey: "mistral",
          modelRef: "mistral-large-latest",
          error: "429",
        },
      ],
    )

    expect(response.degradationType).toBe("stale-cached-answer")
    expect(response.partialContent).toBeDefined()
    expect(typeof response.partialContent).toBe("string")
    // The cached result was an object, so partialContent should be JSON
    expect(() => JSON.parse(response.partialContent!)).not.toThrow()
  })

  test("should include string partialContent from cache for stale-cached-answer", () => {
    cacheEvaluationData("evaluation", {
      result: "cached string result",
      timestamp: Date.now(),
    })

    const response = createDegradationResponse(
      "evaluation",
      [{ adapterKey: "mistral", modelRef: "mistral-large-latest" }],
      [
        {
          adapterKey: "mistral",
          modelRef: "mistral-large-latest",
          error: "429",
        },
      ],
    )

    expect(response.degradationType).toBe("stale-cached-answer")
    expect(response.partialContent).toBe("cached string result")
  })

  test("should not include partialContent for no-answer-available degradation", () => {
    const response = createDegradationResponse(
      "embedding-local",
      [{ adapterKey: "local", modelRef: "e5-base-instruct" }],
      [
        {
          adapterKey: "local",
          modelRef: "e5-base-instruct",
          error: "unavailable",
        },
      ],
    )

    expect(response.degradationType).toBe("no-answer-available")
    expect(response.partialContent).toBeUndefined()
  })

  test("should not include partialContent for fallback-generated-minimal-response degradation", () => {
    const response = createDegradationResponse(
      "primary",
      [{ adapterKey: "perplexity", modelRef: "model-x" }],
      [{ adapterKey: "perplexity", modelRef: "model-x", error: "5xx" }],
    )

    expect(response.degradationType).toBe("fallback-generated-minimal-response")
    expect(response.partialContent).toBeUndefined()
  })

  test("should produce correct message for each degradation type", () => {
    // no-answer-available (embedding role, no cache)
    const noAnswer = createDegradationResponse(
      "embedding-local",
      [{ adapterKey: "local", modelRef: "e5-base" }],
      [{ adapterKey: "local", modelRef: "e5-base", error: "down" }],
    )
    expect(noAnswer.message).toContain("No AI response is currently available")

    // partial-answer
    const partial = createDegradationResponse(
      "primary",
      [{ adapterKey: "perplexity", modelRef: "model-x" }],
      [{ adapterKey: "perplexity", modelRef: "model-x", error: "truncated" }],
      "some partial text",
    )
    expect(partial.message).toContain("partial response")

    // stale-cached-answer
    cacheEvaluationData("evaluation", {
      result: "cached",
      timestamp: Date.now(),
    })
    const stale = createDegradationResponse(
      "evaluation",
      [{ adapterKey: "mistral", modelRef: "mistral-large-latest" }],
      [
        {
          adapterKey: "mistral",
          modelRef: "mistral-large-latest",
          error: "429",
        },
      ],
    )
    expect(stale.message).toContain("previously cached result")

    // fallback-generated-minimal-response
    const fallback = createDegradationResponse(
      "primary",
      [{ adapterKey: "perplexity", modelRef: "model-x" }],
      [{ adapterKey: "perplexity", modelRef: "model-x", error: "5xx" }],
    )
    expect(fallback.message).toContain("minimal fallback response")
  })
})

// ===========================================================================
// isDegradationResponse type guard
// ===========================================================================

describe("A6: isDegradationResponse", () => {
  test("should return true for a valid DegradationResponse", () => {
    const response = createDegradationResponse(
      "primary",
      [{ adapterKey: "perplexity", modelRef: "model-x" }],
      [{ adapterKey: "perplexity", modelRef: "model-x", error: "5xx" }],
    )

    expect(isDegradationResponse(response)).toBe(true)
  })

  test("should return false for null", () => {
    expect(isDegradationResponse(null)).toBe(false)
  })

  test("should return false for undefined", () => {
    expect(isDegradationResponse(undefined)).toBe(false)
  })

  test("should return false for a plain object without isDegradation", () => {
    expect(isDegradationResponse({ roleId: "primary" })).toBe(false)
  })

  test("should return false for an object with isDegradation: false", () => {
    expect(isDegradationResponse({ isDegradation: false })).toBe(false)
  })

  test("should return false for a string", () => {
    expect(isDegradationResponse("error")).toBe(false)
  })

  test("should return false for a number", () => {
    expect(isDegradationResponse(42)).toBe(false)
  })
})

// ===========================================================================
// DegradationType exhaustiveness
// ===========================================================================

describe("A6: DegradationType values", () => {
  const validTypes: DegradationType[] = [
    "no-answer-available",
    "partial-answer",
    "stale-cached-answer",
    "fallback-generated-minimal-response",
  ]

  test("should support all four degradation types from the spec", () => {
    expect(validTypes).toHaveLength(4)
    expect(validTypes).toContain("no-answer-available")
    expect(validTypes).toContain("partial-answer")
    expect(validTypes).toContain("stale-cached-answer")
    expect(validTypes).toContain("fallback-generated-minimal-response")
  })

  test("each type should be representable in a DegradationResponse", () => {
    for (const type of validTypes) {
      const response: DegradationResponse = {
        isDegradation: true,
        degradationType: type,
        message: `Test message for ${type}`,
        roleId: "primary",
        attemptedModels: [],
        failureReasons: [],
        timestamp: new Date(),
      }

      expect(response.degradationType).toBe(type)
      expect(isDegradationResponse(response)).toBe(true)
    }
  })
})
