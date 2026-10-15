import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Gnome (dwarf) sort — one pointer, one rule: if the pair is in order, step
 * forward; otherwise swap and step back. The sorted prefix is everything
 * left of the pointer, so it marks progress as it advances.
 */
export function createGnome(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  let pos = 0
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
      if (pos >= n) {
        finished = true
        return { kind: 'done' }
      }
      if (pos === 0) {
        pos = 1
        continue
      }
      const i1 = pos - 1
      const i2 = pos
      if (a[i1] > a[i2]) {
        // Count the comparison now; the swap is emitted next step and the
        // mutation is applied when it is dequeued (see above).
        pending.push({ kind: 'swap', i: i1, j: i2 })
        pos--
        return { kind: 'compare', i: i1, j: i2 }
      }
      pos++
      pending.push({ kind: 'sorted', i: i2 })
      return { kind: 'compare', i: i1, j: i2 }
    }
  }

  return { step, values: () => a, length: n }
}

export const gnome: SortAlgorithm = {
  id: 'gnome',
  name: 'Gnome Sort',
  blurb:
    'One pointer, one rule: in order → step forward, otherwise swap and step back. Dead simple, and it always works.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: true,
  inPlace: true,
  create: createGnome,
}
