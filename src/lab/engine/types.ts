/**
 * Core engine types — pure TS, no React/DOM.
 *
 * The engine's contract: every algorithm is a *step machine*. `step()`
 * performs exactly one visible micro-operation (compare, swap, write, …)
 * and returns the matching `Action`. When the sort completes, the runner
 * returns a single `done` action and then `null` forever.
 *
 * Stats are derived from the action stream by whoever consumes it
 * (test driver or live scheduler) — one source of truth, no double
 * counting.
 */

export type Action =
  /** Two positions are being compared. */
  | { kind: 'compare'; i: number; j: number }
  /** Two positions are being exchanged. */
  | { kind: 'swap'; i: number; j: number }
  /** A value is being written to a position (aux-array copies). */
  | { kind: 'write'; i: number; value: number }
  /** A position holds a special value (e.g. the current pivot / min). */
  | { kind: 'pivot'; i: number }
  /** The active sub-range — renderers may dim everything outside it. */
  | { kind: 'range'; lo: number; hi: number }
  /** A position is confirmed in its final place. */
  | { kind: 'sorted'; i: number }
  /** The sort finished. */
  | { kind: 'done' }

export interface SortRunner {
  /** Run one micro-step. Returns `null` after the `done` action was emitted. */
  step(): Action | null
  /** The runner's live array (owned internally — treat as read-only). */
  values(): number[]
  /** Element count. */
  readonly length: number
}

export type Distribution = 'random' | 'nearly-sorted' | 'reversed' | 'few-unique'

export interface DistributionSpec {
  id: Distribution
  name: string
  hint: string
}

export interface SortAlgorithm {
  /** URL/key id, e.g. 'quick'. */
  id: string
  /** Display name, e.g. 'Quick Sort'. */
  name: string
  /** One-paragraph description shown on the picker card. */
  blurb: string
  complexity: { best: string; average: string; worst: string; space: string }
  /** Stable: equal elements keep their relative order. */
  stable: boolean
  /** In-place: no auxiliary array proportional to n. */
  inPlace: boolean
  /** Create a runner that owns its own copy of `values`. */
  create: (values: number[]) => SortRunner
}

export interface SortStats {
  comparisons: number
  swaps: number
  writes: number
  /** Total visible actions (compares + swaps + writes). */
  steps: number
}
