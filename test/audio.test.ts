import assert from 'node:assert/strict'
import { test } from 'node:test'
import { freqForValue } from '../src/lab/audio/engine.ts'

/**
 * The pentatonic value→frequency mapping is the audio design's musical core;
 * it is a pure export so it can be asserted without any DOM/Web Audio.
 * (The Web Audio graph itself is verified in-browser, gate G7.)
 */

test('freqForValue: bounded, positive, and monotonic in the bar value', () => {
  let prev = 0
  for (let i = 0; i <= 100; i++) {
    const f = freqForValue(i / 100)
    assert.ok(f > 0, `frequency must be positive, got ${f}`)
    assert.ok(f >= 200 && f <= 4000, `frequency out of range: ${f}`)
    assert.ok(f >= prev, `frequency must not decrease with value: ${f} < ${prev} at ${i / 100}`)
    prev = f
  }
})

test('freqForValue: every pitch lands on the C-major pentatonic scale', () => {
  // The 15 scale degrees of 3 pentatonic octaves over A3 (220 Hz).
  const penta = [0, 2, 4, 7, 9]
  const allowed = new Set<number>()
  for (let octave = 0; octave < 3; octave++) {
    for (const semi of penta) {
      allowed.add(220 * Math.pow(2, (octave * 12 + semi) / 12))
    }
  }
  for (let i = 0; i <= 1000; i++) {
    const f = freqForValue(i / 1000)
    const hit = [...allowed].some((a) => Math.abs(a - f) / a < 1e-9)
    assert.ok(hit, `frequency ${f} at value ${i / 1000} is not on the pentatonic scale`)
  }
})

test('freqForValue: per-lane offset shifts pitch and stays within one octave', () => {
  const v = 0.5
  const base = freqForValue(v, 0)
  const shifted = freqForValue(v, 3)
  assert.ok(shifted > base, 'a lane offset must raise the pitch')
  assert.ok(shifted / base < 2, 'lane offset must stay within one octave')
  // (li * 5) % 12 gives distinct offsets for lanes 0..11
  const offsets = Array.from({ length: 12 }, (_, li) => freqForValue(v, li))
  assert.equal(new Set(offsets).size, 12, '12 lanes should get 12 distinct pitches')
})

test('freqForValue: input is clamped to [0, 1]', () => {
  assert.equal(freqForValue(-5), freqForValue(0))
  assert.equal(freqForValue(5), freqForValue(1))
})
