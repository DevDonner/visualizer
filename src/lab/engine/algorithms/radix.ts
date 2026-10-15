import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Radix sort (LSD, base 256) — values are mapped to 16-bit keys and sorted
 * with two stable counting-sort passes, low byte first. Linear time for
 * bounded integer keys; no comparisons of elements at all.
 */
/**
 * The 16-bit key radix sorts by. Distinct doubles within 1/65535 share a key,
 * so the guarantee is stable non-decreasing *key* order — not exact double
 * order. Exported so the debug seam can assert the contract directly.
 */
export const radixKey = (v: number): number => Math.round(v * 65535)

export function createRadix(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  // Keys must be derived from the CURRENT position each pass: LSD reorders
  // the array, so a precomputed per-index key array would go stale.
  const keyOf = radixKey
  const aux = new Array<number>(n)
  const count = new Int32Array(256)
  const offset = new Int32Array(257)

  let pass = 0
  let phase: 'read' | 'scatter' | 'copy' = 'read'
  let i = 0
  let finished = false
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued

      if (phase === 'read') {
        if (i >= n) {
          let acc = 0
          for (let d = 0; d < 256; d++) {
            offset[d] = acc
            acc += count[d]
          }
          phase = 'scatter'
          i = 0
          continue
        }
        const d = (keyOf(a[i]) >> (8 * pass)) & 255
        count[d]++
        i++
        return { kind: 'pivot', i: i - 1 }
      }

      if (phase === 'scatter') {
        if (i >= n) {
          phase = 'copy'
          i = 0
          continue
        }
        const d = (keyOf(a[i]) >> (8 * pass)) & 255
        const pos = offset[d]++
        aux[pos] = a[i]
        i++
        return { kind: 'write', i: pos, value: aux[pos] }
      }

      // copy
      if (i >= n) {
        pass++
        if (pass >= 2) {
          finished = true
          return { kind: 'done' }
        }
        phase = 'read'
        i = 0
        count.fill(0)
        continue
      }
      a[i] = aux[i]
      i++
      return { kind: 'write', i: i - 1, value: a[i - 1] }
    }
  }

  return { step, values: () => a, length: n }
}

export const radix: SortAlgorithm = {
  id: 'radix',
  name: 'Radix Sort',
  blurb:
    'No comparisons at all — two stable counting-sort passes over the low and high byte of each key. Linear time when keys are bounded.',
  complexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)', space: 'O(n)' },
  stable: true,
  inPlace: false,
  create: createRadix,
}
