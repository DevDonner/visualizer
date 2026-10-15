import type { Action } from '../types.ts'

/**
 * A step-through merge of two adjacent sorted runs a[lo..mid] and
 * a[mid+1..hi]. Shared by merge sort and TimSort.
 *
 * The source span is copied to `aux` lazily on the first step — so a frame
 * may be *scheduled* (with final indices) before the data it will read is
 * in its final state.
 */
export interface MergeFrame {
  lo: number
  mid: number
  hi: number
  l: number
  r: number
  k: number
  aux: number[] | null
  choice: 'L' | 'R' | null
}

export function makeMergeFrame(lo: number, mid: number, hi: number): MergeFrame {
  return { lo, mid, hi, l: lo, r: mid + 1, k: lo, aux: null, choice: null }
}

/**
 * Advance the frame by one visible action. Returns `false` when the frame
 * is complete (both runs consumed). `a` is mutated in place.
 */
export function stepMergeFrame(a: number[], f: MergeFrame): Action | false {
  if (f.aux === null) f.aux = a.slice(f.lo, f.hi + 1)
  if (f.k >= f.hi + 1) return false
  if (f.choice === 'L') {
    const v = f.aux[f.l - f.lo]
    a[f.k] = v
    f.l++
    f.k++
    f.choice = null
    return { kind: 'write', i: f.k - 1, value: v }
  }
  if (f.choice === 'R') {
    const v = f.aux[f.r - f.lo]
    a[f.k] = v
    f.r++
    f.k++
    f.choice = null
    return { kind: 'write', i: f.k - 1, value: v }
  }
  if (f.l > f.mid) {
    const v = f.aux[f.r - f.lo]
    a[f.k] = v
    f.r++
    f.k++
    return { kind: 'write', i: f.k - 1, value: v }
  }
  if (f.r > f.hi) {
    const v = f.aux[f.l - f.lo]
    a[f.k] = v
    f.l++
    f.k++
    return { kind: 'write', i: f.k - 1, value: v }
  }
  // `<=` keeps equal elements in their original order (stability).
  f.choice = f.aux[f.l - f.lo] <= f.aux[f.r - f.lo] ? 'L' : 'R'
  return { kind: 'compare', i: f.l, j: f.r }
}
