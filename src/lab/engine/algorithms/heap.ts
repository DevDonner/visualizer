import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

interface SiftState {
  node: number
  bound: number
  largest: number
  stage: 'l' | 'r' | 'decide'
  resL: boolean
  resR: boolean
}

/**
 * Heapsort — Floyd heap construction, then repeatedly extract the root
 * (max) to the end and sift down. In place, O(n log n) in all cases.
 */
export function createHeap(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  let phase: 'build' | 'extract' = 'build'
  let buildIdx = (n >> 1) - 1
  let end = n - 1
  let sift: SiftState | null = null
  let extractSub: 'swap' | 'sift' = 'swap'
  let endMarked = false
  let finished = false
  const pending: Action[] = []

  function startSift(node: number, bound: number) {
    sift = { node, bound, largest: node, stage: 'l', resL: false, resR: false }
  }

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued

      if (sift) {
        const s = sift
        const l = 2 * s.node + 1
        const r = l + 1
        if (l >= s.bound) {
          sift = null
          continue
        }
        if (s.stage === 'l') {
          s.resL = a[l] > a[s.largest]
          s.stage = 'r'
          return { kind: 'compare', i: l, j: s.largest }
        }
        if (s.stage === 'r') {
          s.largest = s.resL ? l : s.largest
          if (r < s.bound) {
            s.resR = a[r] > a[s.largest]
            s.stage = 'decide'
            return { kind: 'compare', i: r, j: s.largest }
          }
          s.stage = 'decide'
          continue
        }
        // decide
        if (r < s.bound && s.resR) s.largest = r
        if (s.largest !== s.node) {
          const from = s.node
          ;[a[s.node], a[s.largest]] = [a[s.largest], a[s.node]]
          s.node = s.largest
          s.largest = s.node
          s.stage = 'l'
          return { kind: 'swap', i: from, j: s.largest }
        }
        sift = null
        continue
      }

      if (phase === 'build') {
        if (buildIdx >= 0) {
          startSift(buildIdx, n)
          buildIdx--
          continue
        }
        phase = 'extract'
        extractSub = 'swap'
        continue
      }

      // extract
      if (end < 1) {
        if (!endMarked) {
          endMarked = true
          pending.push({ kind: 'sorted', i: 0 })
          continue
        }
        finished = true
        return { kind: 'done' }
      }
      if (extractSub === 'swap') {
        const e = end
        ;[a[0], a[e]] = [a[e], a[0]]
        pending.push({ kind: 'sorted', i: e })
        end = e - 1
        extractSub = 'sift'
        return { kind: 'swap', i: 0, j: e }
      }
      extractSub = 'swap'
      // The heap now spans a[0..end] (end elements) → exclusive bound is end+1.
      startSift(0, end + 1)
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const heap: SortAlgorithm = {
  id: 'heap',
  name: 'Heap Sort',
  blurb:
    'Builds a max-heap in place, then repeatedly swaps the root to the end and sifts the new root down. O(n log n) with no extra memory.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
  stable: false,
  inPlace: true,
  create: createHeap,
}
