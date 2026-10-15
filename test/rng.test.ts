import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mulberry32 } from '../src/lab/engine/rng.ts'

test('same seed produces the same sequence', () => {
  const a = mulberry32(42)
  const b = mulberry32(42)
  for (let i = 0; i < 100; i++) assert.equal(a(), b())
})

test('outputs stay in [0, 1)', () => {
  const rand = mulberry32(7)
  for (let i = 0; i < 1000; i++) {
    const v = rand()
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`)
  }
})

test('different seeds produce different sequences', () => {
  const a = mulberry32(1)
  const b = mulberry32(2)
  const seq = (r: () => number) => Array.from({ length: 16 }, () => r())
  assert.notDeepEqual(seq(a), seq(b))
})
