import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

type Frame =
  | { ph: 'pick'; lo: number; mid: number; hi: number; stage: 1 | 2 | 3 | 4; s1: number; s2: number; med: number }
  | { ph: 'scan'; lo: number; hi: number; i: number; j: number }
  | { ph: 'place'; lo: number; hi: number; i: number }

/**
 * Quicksort — in-place Lomuto partitioning with a median-of-three pivot.
 * The active partition range is highlighted via `range` actions so the
 * renderer can dim everything outside it.
 */
export function createQuick(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  const stack: Frame[] = [
    { ph: 'pick', lo: 0, mid: (n - 1) >> 1, hi: n - 1, stage: 1, s1: 0, s2: 0, med: 0 },
  ]
  let finished = false
  const pending: Action[] = []

  function pushSub(lo: number, hi: number) {
    if (hi - lo + 1 >= 2) {
      stack.push({ ph: 'pick', lo, mid: (lo + hi) >> 1, hi, stage: 1, s1: 0, s2: 0, med: 0 })
    }
  }

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued
      const f = stack[stack.length - 1]
      if (!f) {
        finished = true
        return { kind: 'done' }
      }

      if (f.ph === 'pick') {
        if (f.stage === 1) {
          if (f.hi - f.lo === 1) {
            // Two elements: median is the larger one.
            f.med = a[f.lo] <= a[f.hi] ? f.hi : f.lo
            f.stage = 4
            return { kind: 'compare', i: f.lo, j: f.hi }
          }
          f.s1 = a[f.lo] <= a[f.mid] ? f.lo : f.mid
          f.stage = 2
          return { kind: 'compare', i: f.lo, j: f.mid }
        }
        if (f.stage === 2) {
          f.s2 = a[f.s1] <= a[f.hi] ? f.s1 : f.hi
          if (f.s2 === f.s1) {
            // s1 is the global min — one more compare decides the median.
            f.stage = 3
            return { kind: 'compare', i: f.s1, j: f.hi }
          }
          // hi is the global min → the median is s1.
          f.med = f.s1
          f.stage = 4
          continue
        }
        if (f.stage === 3) {
          // s1 is the global min; the median is the smaller of the other two.
          f.stage = 4
          if (f.s1 === f.lo) {
            f.med = a[f.mid] <= a[f.hi] ? f.mid : f.hi
            return { kind: 'compare', i: f.mid, j: f.hi }
          }
          f.med = a[f.lo] <= a[f.hi] ? f.lo : f.hi
          return { kind: 'compare', i: f.lo, j: f.hi }
        }
        // Stage 4: move the pivot to hi, then start the Lomuto scan.
        pending.push({ kind: 'range', lo: f.lo, hi: f.hi })
        pending.push({ kind: 'pivot', i: f.hi })
        const from = f.med
        if (f.med !== f.hi) {
          ;[a[f.med], a[f.hi]] = [a[f.hi], a[f.med]]
          stack[stack.length - 1] = { ph: 'scan', lo: f.lo, hi: f.hi, i: f.lo - 1, j: f.lo }
          return { kind: 'swap', i: from, j: f.hi }
        }
        stack[stack.length - 1] = { ph: 'scan', lo: f.lo, hi: f.hi, i: f.lo - 1, j: f.lo }
        continue
      }

      if (f.ph === 'scan') {
        if (f.j < f.hi) {
          if (a[f.j] < a[f.hi]) {
            f.i++
            if (f.i !== f.j) {
              ;[a[f.i], a[f.j]] = [a[f.j], a[f.i]]
              pending.push({ kind: 'swap', i: f.i, j: f.j })
            }
          }
          f.j++
          return { kind: 'compare', i: f.j - 1, j: f.hi }
        }
        stack[stack.length - 1] = { ph: 'place', lo: f.lo, hi: f.hi, i: f.i }
        continue
      }

      // place: settle the pivot, then partition both sides.
      const p = f.i + 1
      if (p !== f.hi) {
        ;[a[p], a[f.hi]] = [a[f.hi], a[p]]
        pending.push({ kind: 'sorted', i: p })
        const { lo, hi } = f
        stack.pop()
        pushSub(p + 1, hi)
        pushSub(lo, p - 1)
        return { kind: 'swap', i: p, j: f.hi }
      }
      pending.push({ kind: 'sorted', i: p })
      stack.pop()
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const quick: SortAlgorithm = {
  id: 'quick',
  name: 'Quick Sort',
  blurb:
    'Partitions around a median-of-three pivot, then recurses on both sides — all in place. Blistering in practice, O(n²) only on adversarial pivots.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
  stable: false,
  inPlace: true,
  create: createQuick,
}
