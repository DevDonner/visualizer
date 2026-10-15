import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'
import { makeMergeFrame, stepMergeFrame, type MergeFrame } from './mergeFrame.ts'

type Frame = { type: 'sort'; lo: number; hi: number } | { type: 'merge'; f: MergeFrame }

/**
 * Top-down merge sort — split in halves, then merge runs back together
 * through an auxiliary buffer. Stable, O(n log n) in all cases.
 */
export function createMerge(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  const stack: Frame[] = [{ type: 'sort', lo: 0, hi: n - 1 }]
  let finished = false
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued
      const top = stack[stack.length - 1]
      if (!top) {
        finished = true
        return { kind: 'done' }
      }
      if (top.type === 'merge') {
        const act = stepMergeFrame(a, top.f)
        if (act === false) stack.pop()
        else return act
        continue
      }
      const { lo, hi } = top
      stack.pop() // consume the frame before pushing its children
      const span = hi - lo + 1
      if (span < 2) {
        if (span === 1) pending.push({ kind: 'sorted', i: lo })
        continue
      }
      const mid = (lo + hi) >> 1
      stack.push({ type: 'merge', f: makeMergeFrame(lo, mid, hi) })
      stack.push({ type: 'sort', lo: mid + 1, hi })
      stack.push({ type: 'sort', lo, hi: mid })
      if (mid > lo) return { kind: 'compare', i: mid - 1, j: mid }
      continue // span of 2 — no boundary to show
    }
  }

  return { step, values: () => a, length: n }
}

export const merge: SortAlgorithm = {
  id: 'merge',
  name: 'Merge Sort',
  blurb:
    'Splits the array in half recursively, then merges the sorted halves through an auxiliary buffer. Guaranteed O(n log n), stable.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  stable: true,
  inPlace: false,
  create: createMerge,
}
