import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeData } from '../src/lab/engine/data.ts'
import { runSort } from '../src/lab/engine/run.ts'
import { ALGORITHMS } from '../src/lab/engine/registry.ts'

const SIZES = [0, 1, 2, 3, 5, 17, 64, 257]
const DISTS = ['random', 'nearly-sorted', 'reversed', 'few-unique'] as const

/** Radix's documented contract: stable sort by 16-bit key (not exact double). */
const radixKey = (v: number) => Math.round(v * 65535)
function radixExpected(input: number[]): number[] {
  return input
    .map((v, idx) => [radixKey(v), idx, v] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((t) => t[2])
}

for (const algo of ALGORITHMS) {
  test(`${algo.id}: sorted output & permutation — all sizes × distributions`, () => {
    for (const n of SIZES) {
      for (const d of DISTS) {
        const input = makeData(n, d, 42)
        const { final, stats } = runSort(algo.create(input))
        const expected = algo.id === 'radix' ? radixExpected(input) : [...input].sort((x, y) => x - y)
        assert.deepEqual(final, expected, `${algo.id} n=${n} dist=${d}`)
        assert.ok(
          stats.comparisons >= 0 && stats.swaps >= 0 && stats.writes >= 0 && stats.steps > 0,
          `bad stats for ${algo.id} n=${n}`,
        )
      }
    }
  })

  test(`${algo.id}: converges quickly at n=1024`, () => {
    const input = makeData(1024, 'random', 7)
    const { final, steps } = runSort(algo.create(input))
    assert.ok(steps < 2_000_000, `${algo.id} took ${steps} steps at n=1024`)
    if (algo.id === 'radix') {
      assert.deepEqual(final, radixExpected(input), 'radix key contract at n=1024')
    } else {
      assert.deepEqual(final, [...input].sort((x, y) => x - y), `${algo.id} n=1024 output`)
    }
  })
}
