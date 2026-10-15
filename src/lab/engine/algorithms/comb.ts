import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Comb sort — like bubble sort, but compares elements a shrinking gap apart
 * (÷1.3 each pass) instead of neighbours. Cuts through "turtles" fast.
 */
export function createComb(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  let gap = Math.max(1, n >> 1)
  let i = 0
  let swapped = false
  let started = false
  let finished = false

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      if (!started) {
        started = true
        i = 0
        swapped = false
        continue
      }
      if (i < n - gap) {
        const i1 = i
        const i2 = i + gap
        if (a[i1] > a[i2]) {
          ;[a[i1], a[i2]] = [a[i2], a[i1]]
          swapped = true
          i++
          return { kind: 'swap', i: i1, j: i2 }
        }
        i++
        return { kind: 'compare', i: i1, j: i2 }
      }
      // Pass complete.
      if (gap === 1 && !swapped) {
        finished = true
        return { kind: 'done' }
      }
      gap = Math.max(1, Math.floor(gap / 1.3))
      started = false
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const comb: SortAlgorithm = {
  id: 'comb',
  name: 'Comb Sort',
  blurb:
    'Bubble sort with a shrinking gap (÷1.3 per pass) — compares far-apart elements first, so small values jump instead of crawling.',
  complexity: { best: 'O(n)', average: 'O(n²/2.25)', worst: 'O(n²)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  create: createComb,
}
