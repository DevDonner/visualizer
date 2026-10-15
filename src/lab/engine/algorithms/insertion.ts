import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Insertion sort — grows a sorted prefix by inserting the next element with
 * adjacent swaps. Excellent on nearly-sorted data (best case O(n)).
 */
export function createInsertion(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  let i = 1
  let j = 1
  let scanning = false
  let zeroMarked = false
  let finished = false
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued
      if (i >= n) {
        if (!zeroMarked) {
          zeroMarked = true
          pending.push({ kind: 'sorted', i: 0 })
          continue
        }
        finished = true
        return { kind: 'done' }
      }
      if (!scanning) {
        scanning = true
        j = i
        continue
      }
      if (j > 0) {
        const i1 = j - 1
        const i2 = j
        if (a[i1] > a[i2]) {
          ;[a[i1], a[i2]] = [a[i2], a[i1]]
          j--
          return { kind: 'swap', i: i1, j: i2 }
        }
        // Element placed.
        scanning = false
        pending.push({ kind: 'sorted', i: i })
        i++
        return { kind: 'compare', i: i1, j: i2 }
      }
      // Inserted at the front.
      scanning = false
      pending.push({ kind: 'sorted', i: i })
      i++
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const insertion: SortAlgorithm = {
  id: 'insertion',
  name: 'Insertion Sort',
  blurb:
    'Builds a sorted prefix one element at a time, sliding each new element left until it fits. The go-to for nearly-sorted data.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: true,
  inPlace: true,
  create: createInsertion,
}
