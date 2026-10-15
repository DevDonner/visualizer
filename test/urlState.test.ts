import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseUrlState, serializeUrlState } from '../src/lab/ui/urlState.ts'

/**
 * URL state makes races shareable / reproducible (?algos=…&n=…&dist=…&speed=…&seed=…).
 * The parser must be forgiving: a bad field is dropped individually, never the
 * whole URL. Pure (no window) — verified here in node; the browser wiring is
 * covered by the G6 verification.
 */

test('parseUrlState: a full valid URL parses every field', () => {
  const s = parseUrlState('?algos=bubble,quick,timsort&n=256&dist=reversed&speed=8&seed=42')
  assert.equal(s.algos, 'bubble,quick,timsort')
  assert.equal(s.n, 256)
  assert.equal(s.dist, 'reversed')
  assert.equal(s.speed, 8)
  assert.equal(s.seed, 42)
})

test('parseUrlState: invalid fields are dropped individually', () => {
  const s = parseUrlState('?algos=nope,bubble&n=100&dist=bogus&speed=7.7&seed=0')
  assert.equal(s.algos, 'bubble') // unknown id ignored, valid one kept
  assert.equal(s.n, null) // 100 is not a size stop
  assert.equal(s.dist, null)
  assert.equal(s.speed, null) // 7.7 is not a speed stop
  assert.equal(s.seed, null) // 0 out of range
})

test('parseUrlState: algos collapse duplicates and come back in registry order', () => {
  const s = parseUrlState('?algos=timsort,quick,bubble,quick')
  assert.equal(s.algos, 'bubble,quick,timsort')
})

test('parseUrlState: an empty search yields all nulls (defaults apply)', () => {
  assert.deepEqual(parseUrlState(''), { algos: null, n: null, dist: null, speed: null, seed: null })
})

test('serializeUrlState: the output round-trips through the parser', () => {
  const qs = serializeUrlState({
    selectedKey: 'bubble,quick',
    sizeIdx: 6, // n = 1024
    dist: 'reversed',
    seed: 7,
    speedIdx: 8, // ×64
  })
  const s = parseUrlState(`?${qs}`)
  assert.equal(s.algos, 'bubble,quick')
  assert.equal(s.n, 1024)
  assert.equal(s.dist, 'reversed')
  assert.equal(s.speed, 64)
  assert.equal(s.seed, 7)
})
