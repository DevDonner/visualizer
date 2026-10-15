import type { Action, SortRunner, SortStats } from './types.ts'

export interface RunResult {
  stats: SortStats
  /** Final array state (copy). */
  final: number[]
  /** Total visible actions performed. */
  steps: number
}

/** Count one action into `stats` (shared by the test driver and the live scheduler). */
export function countAction(stats: SortStats, a: Action): void {
  stats.steps++
  switch (a.kind) {
    case 'compare':
      stats.comparisons++
      break
    case 'swap':
      stats.swaps++
      break
    case 'write':
      stats.writes++
      break
    case 'pivot':
    case 'range':
    case 'sorted':
    case 'done':
      break
  }
}

/**
 * Run a runner to completion, validating the whole action stream:
 * indices in range, finite write values, legal ranges, and a single
 * terminal `done`. This is the correctness core of the test matrix —
 * any off-by-one in an algorithm surfaces here immediately.
 */
export function runSort(runner: SortRunner): RunResult {
  const n = runner.length
  const stats: SortStats = { comparisons: 0, swaps: 0, writes: 0, steps: 0 }
  let steps = 0
  for (;;) {
    const a = runner.step()
    if (a === null) throw new Error(`runner returned null before 'done' (n=${n})`)
    steps++
    if (steps > 20_000_000) throw new Error(`run did not converge in ${steps} steps (infinite loop?)`)
    validateAction(a, n)
    countAction(stats, a)
    if (a.kind === 'done') return { stats, final: runner.values().slice(), steps }
  }
}

function validateAction(a: Action, n: number): void {
  switch (a.kind) {
    case 'compare':
    case 'swap':
      if (a.i < 0 || a.i >= n || a.j < 0 || a.j >= n) {
        throw new Error(`index out of range: ${JSON.stringify(a)} (n=${n})`)
      }
      break
    case 'write':
      if (a.i < 0 || a.i >= n) throw new Error(`write index out of range: ${JSON.stringify(a)} (n=${n})`)
      if (!Number.isFinite(a.value)) throw new Error(`non-finite written value: ${a.value}`)
      break
    case 'pivot':
    case 'sorted':
      if (a.i < 0 || a.i >= n) throw new Error(`${a.kind} index out of range: ${JSON.stringify(a)} (n=${n})`)
      break
    case 'range':
      if (a.lo < 0 || a.hi >= n || a.lo > a.hi) {
        throw new Error(`illegal range: ${JSON.stringify(a)} (n=${n})`)
      }
      break
    case 'done':
      break
  }
}
