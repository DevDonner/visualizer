import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Bubble sort with pass-bound tightening.
 *
 * Each pass bubbles the largest unsorted value to the end of the
 * unsorted region; the bound shrinks to the last swap position, and a
 * pass with no swaps terminates early (best case O(n)).
 */
export function createBubble(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  /** Index of the last unsorted element (inclusive); shrinks as passes settle. */
  let right = n - 1
  let j = 0
  let lastSwap = -1
  let passStarted = false
  let finished = false
  /** Actions emitted one step apart (e.g. the settled-index mark after a pass). */
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued
      if (right < 1) {
        finished = true
        return { kind: 'done' }
      }
      if (!passStarted) {
        passStarted = true
        lastSwap = -1
        j = 0
        continue
      }
      if (j < right) {
        const i1 = j
        const i2 = j + 1
        if (a[i1] > a[i2]) {
          ;[a[i1], a[i2]] = [a[i2], a[i1]]
          lastSwap = i1
          j++
          return { kind: 'swap', i: i1, j: i2 }
        }
        j++
        return { kind: 'compare', i: i1, j: i2 }
      }
      // Pass complete: index `right` is settled; the region tightens to the
      // last swap position (a pass with no swaps means fully sorted).
      pending.push({ kind: 'sorted', i: right })
      right = lastSwap
      passStarted = false
    }
  }

  return { step, values: () => a, length: n }
}

export const bubble: SortAlgorithm = {
  id: 'bubble',
  name: 'Bubble Sort',
  blurb:
    'Steps through the list comparing adjacent pairs, bubbling the largest unsorted value to the end of each pass. Exits early when a full pass makes no swaps.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: true,
  inPlace: true,
  create: createBubble,
}
