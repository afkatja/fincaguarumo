/**
 * Retrieval parity validation for embedding model changes (FG-29).
 *
 * Required before promoting a candidate embedding model: same golden queries
 * and corpus must meet Recall@k thresholds on the candidate space, and must
 * not regress materially versus the incumbent on labeled relevance.
 *
 * See feature-specs/FG-29-role-based-model-provider.md (Embedding Migration Rule).
 */

/** Spec benchmark matrix: Recall@5 ≥ 0.85 on golden multilingual retrieval. */
export const FG29_DEFAULT_MIN_RECALL_AT_K = 0.85

/** Default k for parity checks (aligned with Recall@5 in the spec). */
export const FG29_DEFAULT_K = 5

/**
 * Maximum allowed drop in mean recall@k (candidate vs incumbent) before
 * rejecting promotion, even if absolute recall stays above the floor.
 */
export const FG29_DEFAULT_MAX_RECALL_REGRESSION = 0.02

export interface RetrievalParityThresholds {
  k?: number
  /** Minimum mean recall@k for the candidate embeddings (default 0.85). */
  minCandidateMeanRecallAtK?: number
  /** Minimum mean recall@k for the incumbent (sanity / golden-set gate). */
  minIncumbentMeanRecallAtK?: number
  /** Candidate mean recall must be >= incumbent mean - this value. */
  maxMeanRecallRegressionVsIncumbent?: number
}

export interface RetrievalParityMetrics {
  k: number
  meanRecallAtKIncumbent: number
  meanRecallAtKCandidate: number
  perQueryRecallIncumbent: number[]
  perQueryRecallCandidate: number[]
  /** Mean |topK_incumbent ∩ topK_candidate| / k — diagnostic when no labels. */
  meanTopKOverlap?: number
}

export interface RetrievalParityResult {
  passed: boolean
  reason?: string
  metrics: RetrievalParityMetrics
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (denom === 0 || !Number.isFinite(denom)) return 0
  const s = dot / denom
  return Number.isFinite(s) ? s : 0
}

/**
 * Corpus indices ordered by descending cosine similarity to the query.
 */
export function rankCorpusByQueryEmbedding(
  queryEmbedding: number[],
  corpusEmbeddings: number[][],
): number[] {
  if (corpusEmbeddings.length === 0) return []
  const scores = corpusEmbeddings.map((doc, idx) => ({
    idx,
    score: cosineSimilarity(queryEmbedding, doc),
  }))
  scores.sort((x, y) => y.score - x.score)
  return scores.map(s => s.idx)
}

/**
 * Standard multi-relevance recall@k: fraction of relevant docs that appear
 * in the top-k ranked list.
 */
export function recallAtK(
  relevantCorpusIndices: ReadonlySet<number>,
  rankedCorpusIndices: readonly number[],
  k: number,
): number {
  if (relevantCorpusIndices.size === 0) return 1
  const kk = Math.min(k, rankedCorpusIndices.length)
  if (kk <= 0) return 0
  let hit = 0
  const top = new Set(rankedCorpusIndices.slice(0, kk))
  for (const r of relevantCorpusIndices) {
    if (top.has(r)) hit++
  }
  return hit / relevantCorpusIndices.size
}

/**
 * Fraction of the incumbent's top-k documents that also appear in the
 * candidate's top-k (same corpus ordering). Useful as a secondary diagnostic.
 */
export function topKOverlapFraction(
  rankedIncumbent: readonly number[],
  rankedCandidate: readonly number[],
  k: number,
): number {
  if (rankedIncumbent.length === 0 || rankedCandidate.length === 0) return 0
  const kk = Math.min(k, rankedIncumbent.length, rankedCandidate.length)
  if (kk <= 0) return 0
  const a = new Set(rankedIncumbent.slice(0, kk))
  let inter = 0
  for (const id of rankedCandidate.slice(0, kk)) {
    if (a.has(id)) inter++
  }
  return inter / kk
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

export interface LabeledRetrievalParityInput {
  /** One embedding vector per corpus document (incumbent model). */
  corpusEmbeddingsIncumbent: number[][]
  /** Same corpus texts embedded with the candidate model (same row order). */
  corpusEmbeddingsCandidate: number[][]
  queryEmbeddingsIncumbent: number[][]
  queryEmbeddingsCandidate: number[][]
  /**
   * For each query, indices into the corpus that are considered relevant
   * (e.g. from MIRACL-style qrels or an internal golden set).
   */
  groundTruthRelevantCorpusIndices: ReadonlyArray<ReadonlyArray<number>>
  thresholds?: RetrievalParityThresholds
}

/**
 * Validates retrieval parity for embedding promotion using labeled relevance.
 * Both models embed the same corpus and queries; rankings are computed in
 * each model's own embedding space, then recall@k is compared.
 */
export function validateLabeledRetrievalParity(
  input: LabeledRetrievalParityInput,
): RetrievalParityResult {
  const k = input.thresholds?.k ?? FG29_DEFAULT_K
  const minCand =
    input.thresholds?.minCandidateMeanRecallAtK ?? FG29_DEFAULT_MIN_RECALL_AT_K
  const minInc =
    input.thresholds?.minIncumbentMeanRecallAtK ?? FG29_DEFAULT_MIN_RECALL_AT_K
  const maxReg =
    input.thresholds?.maxMeanRecallRegressionVsIncumbent ??
    FG29_DEFAULT_MAX_RECALL_REGRESSION

  const nq = input.groundTruthRelevantCorpusIndices.length
  if (nq === 0) {
    return {
      passed: false,
      reason: "No queries in golden set; cannot validate retrieval parity.",
      metrics: {
        k,
        meanRecallAtKIncumbent: 0,
        meanRecallAtKCandidate: 0,
        perQueryRecallIncumbent: [],
        perQueryRecallCandidate: [],
      },
    }
  }

  if (
    input.queryEmbeddingsIncumbent.length !== nq ||
    input.queryEmbeddingsCandidate.length !== nq
  ) {
    return {
      passed: false,
      reason: `Query embedding count (${input.queryEmbeddingsIncumbent.length}/${input.queryEmbeddingsCandidate.length}) must match ground-truth query count (${nq}).`,
      metrics: {
        k,
        meanRecallAtKIncumbent: 0,
        meanRecallAtKCandidate: 0,
        perQueryRecallIncumbent: [],
        perQueryRecallCandidate: [],
      },
    }
  }

  const nCorpus = input.corpusEmbeddingsIncumbent.length
  if (
    nCorpus === 0 ||
    input.corpusEmbeddingsCandidate.length !== nCorpus
  ) {
    return {
      passed: false,
      reason: "Corpus must be non-empty and incumbent/candidate corpus rows must match.",
      metrics: {
        k,
        meanRecallAtKIncumbent: 0,
        meanRecallAtKCandidate: 0,
        perQueryRecallIncumbent: [],
        perQueryRecallCandidate: [],
      },
    }
  }

  const perInc: number[] = []
  const perCand: number[] = []
  const overlaps: number[] = []

  for (let q = 0; q < nq; q++) {
    const rel = new Set(input.groundTruthRelevantCorpusIndices[q])
    const rankedI = rankCorpusByQueryEmbedding(
      input.queryEmbeddingsIncumbent[q]!,
      input.corpusEmbeddingsIncumbent,
    )
    const rankedC = rankCorpusByQueryEmbedding(
      input.queryEmbeddingsCandidate[q]!,
      input.corpusEmbeddingsCandidate,
    )
    perInc.push(recallAtK(rel, rankedI, k))
    perCand.push(recallAtK(rel, rankedC, k))
    overlaps.push(topKOverlapFraction(rankedI, rankedC, k))
  }

  const meanRecallAtKIncumbent = mean(perInc)
  const meanRecallAtKCandidate = mean(perCand)
  const meanTopKOverlap = mean(overlaps)

  const metrics: RetrievalParityMetrics = {
    k,
    meanRecallAtKIncumbent,
    meanRecallAtKCandidate,
    perQueryRecallIncumbent: perInc,
    perQueryRecallCandidate: perCand,
    meanTopKOverlap,
  }

  if (meanRecallAtKIncumbent < minInc) {
    return {
      passed: false,
      reason: `Incumbent mean recall@${k} (${meanRecallAtKIncumbent.toFixed(3)}) is below sanity threshold (${minInc}). Fix golden set or incumbent configuration before comparing candidates.`,
      metrics,
    }
  }

  if (meanRecallAtKCandidate < minCand) {
    return {
      passed: false,
      reason: `Candidate mean recall@${k} (${meanRecallAtKCandidate.toFixed(3)}) is below required minimum (${minCand}).`,
      metrics,
    }
  }

  if (meanRecallAtKCandidate < meanRecallAtKIncumbent - maxReg) {
    return {
      passed: false,
      reason: `Candidate mean recall@${k} regresses more than ${maxReg} versus incumbent (candidate ${meanRecallAtKCandidate.toFixed(3)} vs incumbent ${meanRecallAtKIncumbent.toFixed(3)}).`,
      metrics,
    }
  }

  return { passed: true, metrics }
}

/**
 * True when both vectors are non-empty arrays of the same length.
 * Use before retrieval parity to enforce dimensional compatibility (FR6).
 */
export function embeddingVectorsDimensionMatch(
  a: number[],
  b: number[],
): boolean {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length > 0 &&
    a.length === b.length
  )
}
