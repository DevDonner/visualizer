import type { Distribution, DistributionSpec } from './types.ts'
import { mulberry32 } from './rng.ts'

export const MIN_N = 16
export const MAX_N = 1024

export const DISTRIBUTIONS: DistributionSpec[] = [
  { id: 'random', name: 'Random', hint: 'Uniformly shuffled values' },
  { id: 'nearly-sorted', name: 'Nearly sorted', hint: 'Mostly ordered, a few adjacent inversions' },
  { id: 'reversed', name: 'Reversed', hint: 'Fully descending — the worst case for quadratic sorts' },
  { id: 'few-unique', name: 'Few unique', hint: 'Only 10 distinct values' },
]

/**
 * Generate the shared race input. Every lane receives an identical copy,
 * so the race is a true comparison of algorithms.
 *
 * Values live in [0.02, 1] — never exactly 0, so bars stay visible.
 */
export function makeData(n: number, dist: Distribution, seed: number): number[] {
  const rand = mulberry32(seed)
  const raw = Array.from({ length: n }, () => 0.02 + rand() * 0.98)
  switch (dist) {
    case 'random':
      return raw
    case 'nearly-sorted': {
      const arr = [...raw].sort((x, y) => x - y)
      // Swap ~5% of adjacent pairs → a small number of inversions.
      for (let i = 0; i + 1 < n; i++) {
        if (rand() < 0.05) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
      }
      return arr
    }
    case 'reversed':
      // Descending order — the classic quadratic worst case.
      return [...raw].sort((x, y) => x - y).reverse()
    case 'few-unique': {
      const arr = new Array<number>(n)
      for (let i = 0; i < n; i++) {
        arr[i] = 0.05 + Math.floor(rand() * 10) * 0.1
      }
      return arr
    }
  }
}
