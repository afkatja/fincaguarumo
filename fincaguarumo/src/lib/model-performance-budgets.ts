/**
 * FG-29 non-functional performance budgets (feature-specs/FG-29-role-based-model-provider.md §5).
 */

/** Max wall-clock time for synchronous model selection (routing / provider construction). */
export const MODEL_SELECTION_MAX_LATENCY_MS = 50

/** Max time to resolve the full fallback chain (including connectivity probes). */
export const FALLBACK_CHAIN_MAX_DURATION_MS = 5000

export function assertModelSelectionWithinBudget(
  durationMs: number,
  label: string,
): void {
  if (durationMs > MODEL_SELECTION_MAX_LATENCY_MS) {
    throw new Error(
      `FG-29 NFR: model selection exceeded ${MODEL_SELECTION_MAX_LATENCY_MS}ms (got ${durationMs}ms) — ${label}`,
    )
  }
}
