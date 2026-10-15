import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Shell sort — insertion sort over a shrinking gap sequence (n/2, n/4, …, 1),
 * moving elements far apart early for roughly O(n^1.5) average behaviour.
 */
export function createShell(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  const gaps: number[] = []
  for (let g = n >> 1; g >= 1; g >>= 1) gaps.push(g)
  let gi = 0
  let i = gaps[0]
  let j = gaps[0]
  let finished = false
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) {
        if (queued.kind === 'swap') {
          ;[a[queued.i], a[queued.j]] = [a[queued.j], a[queued.i]]
        }
        return queued
      }
      if (gi >= gaps.length) {
        finished = true
        return { kind: 'done' }
      }
      const gap = gaps[gi]
      if (i < n) {
        if (j >= gap) {
          const i1 = j - gap
          const i2 = j
          if (a[i1] > a[i2]) {
            // Count the comparison now; the swap is emitted next step and the
            // mutation is applied when it is dequeued (see above).
            pending.push({ kind: 'swap', i: i1, j: i2 })
            j -= gap
            return { kind: 'compare', i: i1, j: i2 }
          }
          i++
          j = i
          return { kind: 'compare', i: i1, j: i2 }
        }
        // Element i is placed; move to the next one.
        i++
        j = i
        continue
      }
      // Gap phase complete.
      gi++
      if (gi < gaps.length) {
        i = gaps[gi]
        j = i
      }
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const shell: SortAlgorithm = {
  id: 'shell',
  name: 'Shell Sort',
  blurb:
    'Insertion sort over a shrinking gap sequence (n/2, n/4, … 1) — long jumps first, fine combing last. Beats plain quadratic on average.',
  complexity: { best: 'O(n log n)', average: 'O(n^1.5)', worst: 'O(n²)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  create: createShell,
}
