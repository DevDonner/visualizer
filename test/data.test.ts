import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DISTRIBUTIONS, makeData } from '../src/lab/engine/data.ts'

const SIZE = 256

test('every distribution produces n values in [0.02, 1]', () => {
  for (const d of DISTRIBUTIONS) {
    for (const n of [1, 2, 17, SIZE]) {
      const arr = makeData(n, d.id, 1234)
      assert.equal(arr.length, n, `${d.id} n=${n} length`)
      for (const v of arr) {
        assert.ok(v >= 0.02 && v <= 1, `${d.id} value out of range: ${v}`)
      }
    }
  }
})

test('output is deterministic per seed and differs across seeds', () => {
  const a = makeData(64, 'random', 99)
  const b = makeData(64, 'random', 99)
  const c = makeData(64, 'random', 100)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, c)
})

test('reversed is monotonically non-increasing', () => {
  const arr = makeData(128, 'reversed', 7)
  for (let i = 0; i + 1 < arr.length; i++) {
    assert.ok(arr[i] >= arr[i + 1], `inversion at ${i}`)
  }
})

test('few-unique has at most 10 distinct values', () => {
  const arr = makeData(300, 'few-unique', 5)
  assert.ok(new Set(arr).size <= 10, `distinct = ${new Set(arr).size}`)
})

test('nearly-sorted keeps most adjacent pairs in order', () => {
  const arr = makeData(512, 'nearly-sorted', 3)
  let ordered = 0
  for (let i = 0; i + 1 < arr.length; i++) {
    if (arr[i] <= arr[i + 1]) ordered++
  }
  assert.ok(ordered / (arr.length - 1) >= 0.85, `ordered fraction = ${ordered / (arr.length - 1)}`)
})
