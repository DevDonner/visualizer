import type { SortAlgorithm } from './types.ts'
import { bubble } from './algorithms/bubble.ts'
import { cocktail } from './algorithms/cocktail.ts'
import { selection } from './algorithms/selection.ts'
import { insertion } from './algorithms/insertion.ts'
import { shell } from './algorithms/shell.ts'
import { comb } from './algorithms/comb.ts'
import { gnome } from './algorithms/gnome.ts'
import { merge } from './algorithms/merge.ts'
import { quick } from './algorithms/quick.ts'
import { heap } from './algorithms/heap.ts'
import { radix } from './algorithms/radix.ts'
import { timsort } from './algorithms/timsort.ts'

/** The full algorithm lineup, in picker order (quadratic → linear). */
export const ALGORITHMS: SortAlgorithm[] = [
  bubble,
  cocktail,
  selection,
  insertion,
  shell,
  comb,
  gnome,
  merge,
  quick,
  heap,
  radix,
  timsort,
]

export function algorithmById(id: string): SortAlgorithm | undefined {
  return ALGORITHMS.find((x) => x.id === id)
}
