import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Selection sort — repeatedly finds the minimum of the unsorted suffix and
 * swaps it into place. Exactly n-1 swaps total; the watch shows the running
 * minimum as a pivot highlight.
 */
export function createSelection(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  let i = 0
  let min = 0
  let j = 0
  let scanning = false
  let doneMarked = false
  let finished = false
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued
      if (i >= n - 1) {
        if (!doneMarked) {
          doneMarked = true
          pending.push({ kind: 'sorted', i: n - 1 })
          continue
        }
        finished = true
        return { kind: 'done' }
      }
      if (!scanning) {
        scanning = true
        min = i
        j = i + 1
        continue
      }
      if (j < n) {
        if (a[j] < a[min]) {
          min = j
          pending.push({ kind: 'pivot', i: min })
        }
        j++
        return { kind: 'compare', i: j - 1, j: min }
      }
      // Scan complete: place the minimum.
      scanning = false
      if (min !== i) {
        ;[a[i], a[min]] = [a[min], a[i]]
        pending.push({ kind: 'sorted', i })
        i++
        return { kind: 'swap', i, j: min }
      }
      pending.push({ kind: 'sorted', i })
      i++
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const selection: SortAlgorithm = {
  id: 'selection',
  name: 'Selection Sort',
  blurb:
    'Scans the unsorted suffix for its minimum and swaps it into place — exactly n−1 swaps total, regardless of input order.',
  complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  create: createSelection,
}
