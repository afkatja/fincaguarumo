/**
 * FG-29 retrieval parity validation (labeled golden set, recall@k, regression vs incumbent).
 */

import {
  cosineSimilarity,
  recallAtK,
  rankCorpusByQueryEmbedding,
  topKOverlapFraction,
  validateLabeledRetrievalParity,
  embeddingVectorsDimensionMatch,
  FG29_DEFAULT_K,
  FG29_DEFAULT_MIN_RECALL_AT_K,
} from "../src/lib/semantic-rag/retrieval-parity"

describe("retrieval-parity", () => {
  describe("cosineSimilarity", () => {
    test("identical direction yields 1", () => {
      const v = [1, 2, 3]
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
    })

    test("orthogonal yields 0", () => {
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5)
    })
  })

  describe("recallAtK", () => {
    test("all relevant in top-k", () => {
      const rel = new Set([0, 2])
      const ranked = [0, 2, 5, 1, 3, 4]
      expect(recallAtK(rel, ranked, 5)).toBe(1)
    })

    test("partial recall", () => {
      const rel = new Set([0, 2])
      const ranked = [0, 1, 3, 4, 5, 2]
      expect(recallAtK(rel, ranked, 5)).toBe(0.5)
    })
  })

  describe("rankCorpusByQueryEmbedding", () => {
    test("orders by similarity to query", () => {
      const corpus = [
        [0, 0, 1],
        [1, 0, 0],
        [0.99, 0.01, 0],
      ]
      const q = [1, 0, 0]
      const ranked = rankCorpusByQueryEmbedding(q, corpus)
      expect(ranked[0]).toBe(1)
      expect(ranked[1]).toBe(2)
      expect(ranked[2]).toBe(0)
    })
  })

  describe("topKOverlapFraction", () => {
    test("perfect overlap", () => {
      expect(topKOverlapFraction([1, 2, 3], [1, 2, 3], 3)).toBe(1)
    })

    test("no overlap", () => {
      expect(topKOverlapFraction([1, 2, 3], [4, 5, 6], 3)).toBe(0)
    })
  })

  describe("validateLabeledRetrievalParity", () => {
    test("passes when candidate matches incumbent ranking geometry", () => {
      const corpusInc = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [0.1, 0.1, 0.1],
      ]
      const scale = (v: number[], s: number) => v.map(x => x * s)
      const corpusCand = corpusInc.map(v => scale(v, 1.02))
      const q = [1, 0, 0]
      const qInc = [q]
      const qCand = [scale(q, 1.02)]
      const result = validateLabeledRetrievalParity({
        corpusEmbeddingsIncumbent: corpusInc,
        corpusEmbeddingsCandidate: corpusCand,
        queryEmbeddingsIncumbent: qInc,
        queryEmbeddingsCandidate: qCand,
        groundTruthRelevantCorpusIndices: [[0]],
        thresholds: { k: FG29_DEFAULT_K, minCandidateMeanRecallAtK: 0.85 },
      })
      expect(result.passed).toBe(true)
      expect(result.metrics.meanRecallAtKCandidate).toBeGreaterThanOrEqual(
        FG29_DEFAULT_MIN_RECALL_AT_K,
      )
    })

    test("fails when candidate collapses relevant docs so recall drops", () => {
      const corpusInc = [
        [1, 0, 0],
        [0.9, 0.1, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]
      const corpusCand = [
        [0, 0, 0.01],
        [0, 0, 0.02],
        [1, 0, 0],
        [0.85, 0.15, 0],
      ]
      const qInc = [[1, 0, 0]]
      const qCand = [[1, 0, 0]]
      const result = validateLabeledRetrievalParity({
        corpusEmbeddingsIncumbent: corpusInc,
        corpusEmbeddingsCandidate: corpusCand,
        queryEmbeddingsIncumbent: qInc,
        queryEmbeddingsCandidate: qCand,
        groundTruthRelevantCorpusIndices: [[0, 1]],
        thresholds: { k: 2, minCandidateMeanRecallAtK: 0.85 },
      })
      expect(result.passed).toBe(false)
      expect(result.reason).toContain("Candidate mean recall")
    })

    test("fails on dimension mismatch at call site (empty / invalid corpus)", () => {
      const result = validateLabeledRetrievalParity({
        corpusEmbeddingsIncumbent: [],
        corpusEmbeddingsCandidate: [],
        queryEmbeddingsIncumbent: [[1, 0]],
        queryEmbeddingsCandidate: [[1, 0]],
        groundTruthRelevantCorpusIndices: [[]],
      })
      expect(result.passed).toBe(false)
    })
  })

  describe("embeddingVectorsDimensionMatch", () => {
    test("same length passes", () => {
      expect(embeddingVectorsDimensionMatch([1, 2], [3, 4])).toBe(true)
    })

    test("different length fails", () => {
      expect(embeddingVectorsDimensionMatch([1], [1, 2])).toBe(false)
    })
  })
})
