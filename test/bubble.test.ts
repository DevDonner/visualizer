import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeData } from '../src/lab/engine/data.ts'
import { bubble } from '../src/lab/engine/algorithms/bubble.ts'
import { runSort } from '../src/lab/engine/run.ts'

test('bubble: early exit on already-sorted input (best case O(n))', () => {
  const n = 128
  const sorted = makeData(n, 'random', 8).sort((x, y) => x - y)
  const { steps } = runSort(bubble.create(sorted))
  assert.ok(steps < (n * n) / 2, `expected early exit, got ${steps} steps`)
})
