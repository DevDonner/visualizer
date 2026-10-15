import type { Action, SortAlgorithm, SortRunner } from '../types.ts'
import { doneRunner } from '../runner.ts'
import { makeMergeFrame, stepMergeFrame, type MergeFrame } from './mergeFrame.ts'

const MIN_RUN = 32

/**
 * TimSort — the hybrid behind Java/Python's default sort. Finds natural
 * ascending runs, extends short ones with binary insertion to MIN_RUN, then
 * merges them back using the classic timsort merge policy (merge the last
 * two or three runs when their lengths would otherwise break the stack
 * invariant). Stable, O(n log n) worst case, O(n) on already-sorted input.
 */
export function createTimsort(values: number[]): SortRunner {
  const a = values.slice()
  const n = a.length
  if (n < 2) return doneRunner(a)

  interface Run {
    start: number
    len: number
  }
  const runs: Run[] = []
  const mergeQueue: MergeFrame[] = []
  let start = 0
  let runEnd = 0
  let phase: 'scan' | 'insert' | 'done' = 'scan'
  let insertPos = 0
  let bsLo = 0
  let bsHi = 0
  let bsPhase: 'search' | 'shift' = 'search'
  let shiftIdx = 0
  /** The value being inserted — captured before the shift clobbers a[insertPos]. */
  let insertValue = 0
  let finished = false
  const pending: Action[] = []

  /** Merge the last two runs (k = L-2) or the last three (k = L-3). */
  function mergeAt(k: number) {
    const L = runs.length
    if (k === L - 2) {
      const rA = runs[k]
      const rB = runs[L - 1]
      mergeQueue.push(makeMergeFrame(rA.start, rA.start + rA.len - 1, rB.start + rB.len - 1))
      runs.splice(k, 2, { start: rA.start, len: rA.len + rB.len })
    } else {
      const rC = runs[k]
      const rA = runs[L - 2]
      const rB = runs[L - 1]
      const hi = rB.start + rB.len - 1
      mergeQueue.push(makeMergeFrame(rA.start, rA.start + rA.len - 1, hi))
      mergeQueue.push(makeMergeFrame(rC.start, rC.start + rC.len - 1, hi))
      runs.splice(k, 3, { start: rC.start, len: rC.len + rA.len + rB.len })
    }
  }

  /** Classic timsort merge policy — keep the run-length stack balanced. */
  function scheduleMerges() {
    for (;;) {
      const L = runs.length
      if (L < 2) break
      if (L >= 3) {
        const n1 = runs[L - 2].len
        const n2 = runs[L - 3].len
        const n3 = runs[L - 1].len
        if (n2 < n1 && n2 <= n3) {
          mergeAt(L - 3)
          continue
        }
        if (n1 < n3) {
          mergeAt(L - 2)
          continue
        }
        break
      }
      // Two runs: the invariant only breaks when the earlier is shorter.
      if (runs[0].len < runs[1].len) mergeAt(0)
      break
    }
  }

  function finalizeRun() {
    runs.push({ start, len: runEnd - start + 1 })
    start = runEnd + 1
    scheduleMerges()
    if (start >= n) {
      // Final merge-down of whatever runs remain.
      while (runs.length > 1) mergeAt(runs.length - 2)
      phase = 'done'
    } else {
      phase = 'scan'
    }
  }

  /** End of a natural run: extend by binary insertion if it's short. */
  function pushRun() {
    const target = Math.min(n, start + MIN_RUN)
    if (runEnd - start + 1 < target - start) {
      phase = 'insert'
      insertPos = runEnd + 1
      bsPhase = 'search'
      bsLo = start
      bsHi = insertPos
      return
    }
    finalizeRun()
  }

  function step(): Action | null {
    if (finished) return null
    for (;;) {
      const queued = pending.shift()
      if (queued) return queued

      // Scheduled merges have priority.
      if (mergeQueue.length > 0) {
        const f = mergeQueue[0]
        const act = stepMergeFrame(a, f)
        if (act === false) mergeQueue.shift()
        else return act
        continue
      }

      if (phase === 'done') {
        finished = true
        return { kind: 'done' }
      }

      if (phase === 'scan') {
        if (runEnd + 1 >= n) {
          pushRun()
          continue
        }
        const i1 = runEnd
        const i2 = runEnd + 1
        if (a[i1] > a[i2]) {
          pushRun()
          continue
        }
        runEnd++
        return { kind: 'compare', i: i1, j: i2 }
      }

      // insert: binary-insert a[insertPos] into sorted range [start, insertPos)
      if (bsPhase === 'search') {
        if (bsLo >= bsHi) {
          insertValue = a[insertPos]
          bsPhase = 'shift'
          shiftIdx = insertPos - 1
          continue
        }
        const m = (bsLo + bsHi) >> 1
        // First index with a[m] > value (stable: keep equal elements left).
        if (a[m] > a[insertPos]) bsHi = m
        else bsLo = m + 1
        return { kind: 'compare', i: m, j: insertPos }
      }
      // shift: make room, then place the value.
      if (shiftIdx >= bsLo) {
        const v = a[shiftIdx]
        a[shiftIdx + 1] = v
        shiftIdx--
        return { kind: 'write', i: shiftIdx + 1, value: v }
      }
      a[bsLo] = insertValue
      if (insertPos + 1 < start + MIN_RUN && insertPos + 1 < n) {
        insertPos++
        bsPhase = 'search'
        bsLo = start
        bsHi = insertPos
        return { kind: 'write', i: bsLo, value: insertValue }
      }
      runEnd = insertPos
      finalizeRun()
      continue
    }
  }

  return { step, values: () => a, length: n }
}

export const timsort: SortAlgorithm = {
  id: 'timsort',
  name: 'Tim Sort',
  blurb:
    'The hybrid behind Java and Python: exploit natural runs, insertion-sort short ones, merge with a carefully balanced policy. O(n) on sorted input, O(n log n) guaranteed.',
  complexity: { best: 'O(n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  stable: true,
  inPlace: false,
  create: createTimsort,
}
