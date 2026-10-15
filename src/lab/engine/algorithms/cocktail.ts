import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'

/**
 * Cocktail shaker sort — bubble sort that alternates direction each pass,
 * so small values ("turtles") move toward the front in one pass instead of
 * one position per pass. Bounds tighten to the last swap of each pass.
 */
export function createCocktail(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  let left = 0
  let right = n - 1
  let j = 0
  let lastSwap = -1
  let forward = true
  let started = false
  let finished = false
  const pending: Action[] = []

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued
      if (left >= right) {
        finished = true
        return { kind: 'done' }
      }
      if (!started) {
        started = true
        lastSwap = -1
        j = forward ? left : right
        continue
      }
      if (forward) {
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
        // Forward pass complete: `right` is settled.
        pending.push({ kind: 'sorted', i: right })
        right = lastSwap // -1 → left >= right → done
        forward = false
        started = false
        continue
      }
      if (j > left) {
        const i1 = j - 1
        const i2 = j
        if (a[i1] > a[i2]) {
          ;[a[i1], a[i2]] = [a[i2], a[i1]]
          lastSwap = i1
          j--
          return { kind: 'swap', i: i1, j: i2 }
        }
        j--
        return { kind: 'compare', i: i1, j: i2 }
      }
      // Backward pass complete: `left` is settled.
      pending.push({ kind: 'sorted', i: left })
      left = lastSwap < 0 ? n : lastSwap + 1
      forward = true
      started = false
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const cocktail: SortAlgorithm = {
  id: 'cocktail',
  name: 'Cocktail Shaker',
  blurb:
    'Bubble sort that ping-pongs each pass — forward, then backward — so small values reach the front quickly. Bounds shrink to the last swap of every pass.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  stable: true,
  inPlace: true,
  create: createCocktail,
}
