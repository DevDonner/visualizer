import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'
import { RaceScheduler } from '../src/lab/scheduler.ts'
import { ALGORITHMS } from '../src/lab/engine/registry.ts'
import { makeData } from '../src/lab/engine/data.ts'
import type { SortAlgorithm } from '../src/lab/engine/types.ts'

/**
 * Drives the real RaceScheduler in node: a no-op 2d canvas plus a manual
 * requestAnimationFrame pump give us frame-deterministic control so the
 * per-lane pause / resume / reset semantics can be asserted exactly (the same
 * behaviour that is awkward to catch in a live browser at race speed).
 */

// --- minimal browser shims -------------------------------------------------

function makeCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect() {},
  } as unknown as CanvasRenderingContext2D
}

function makeCanvas(): HTMLCanvasElement {
  return {
    clientWidth: 320,
    clientHeight: 160,
    width: 0,
    height: 0,
    getContext: () => makeCtx(),
  } as unknown as HTMLCanvasElement
}

let rafCb: ((t: number) => void) | null = null
let clock = 0

;(globalThis as Record<string, unknown>).window = { devicePixelRatio: 1 }
;(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) => {
  rafCb = cb
  return 1
}
;(globalThis as Record<string, unknown>).cancelAnimationFrame = () => {
  rafCb = null
}

/** Pump N animation frames at a fixed dt; stops early once the loop self-terminates. */
function pump(frames: number, dt = 16): void {
  for (let f = 0; f < frames; f++) {
    clock += dt
    const cb = rafCb
    rafCb = null
    if (!cb) break
    cb(clock)
  }
}

function makeSched(n: number, ids: string[], speed = 1): RaceScheduler {
  const algos: SortAlgorithm[] = []
  for (const id of ids) {
    const a = ALGORITHMS.find((x) => x.id === id)
    assert.ok(a, `unknown algorithm: ${id}`)
    algos.push(a)
  }
  const data = makeData(n, 'random', 42)
  const inits = algos.map((a, i) => ({ algo: a, canvas: makeCanvas(), hue: 120 + i * 40 }))
  const s = new RaceScheduler(data, inits)
  s.setSpeed(speed)
  return s
}

beforeEach(() => {
  rafCb = null
  clock = 0
})

// --- tests -----------------------------------------------------------------

test('togglePauseLane: a paused lane freezes while others keep advancing', () => {
  const s = makeSched(32, ['bubble', 'quick'], 1)
  s.start()
  pump(3)
  const b = s.lanes[0].stats
  const before = { c: b.comparisons, sw: b.swaps, st: b.steps }
  const qBefore = s.lanes[1].stats.comparisons

  s.togglePauseLane(0)
  assert.equal(s.lanes[0].paused, true)
  pump(80)

  assert.equal(s.lanes[0].stats.comparisons, before.c, 'paused bubble comparisons must not move')
  assert.equal(s.lanes[0].stats.swaps, before.sw)
  assert.equal(s.lanes[0].stats.steps, before.st)
  assert.notEqual(s.lanes[1].stats.comparisons, qBefore, 'unpaused quick must keep advancing')
})

test('togglePauseLane: resuming a lane advances it again', () => {
  const s = makeSched(64, ['bubble'], 1)
  s.start()
  pump(2)
  const mid = s.lanes[0].stats.steps

  s.togglePauseLane(0)
  pump(6)
  assert.equal(s.lanes[0].stats.steps, mid, 'lane must be frozen while paused')

  s.togglePauseLane(0)
  assert.equal(s.lanes[0].paused, false)
  pump(12)
  assert.ok(s.lanes[0].stats.steps > mid, 'resumed lane must advance')
})

test('all lanes paused stops the rAF loop; unpausing revives it', () => {
  const s = makeSched(64, ['bubble', 'insertion'], 1)
  s.start()
  pump(2)
  s.togglePauseLane(0)
  s.togglePauseLane(1)
  pump(1) // this frame sees every lane paused -> loop halts

  assert.equal(s.running, false, 'loop must stop when every lane is paused')
  const ins = s.lanes[1].stats.steps

  s.togglePauseLane(0)
  assert.equal(s.running, true, 'unpausing one lane must revive the loop')
  pump(12)
  assert.ok(s.lanes[0].stats.steps > 0, 'resumed lane advances')
  assert.equal(s.lanes[1].stats.steps, ins, 'still-paused lane must not move')
})

test('a paused lane cannot finish while the others complete', () => {
  const s = makeSched(32, ['bubble', 'quick'], 1)
  s.start()
  pump(2)
  s.togglePauseLane(0) // freeze bubble
  pump(400) // quick finishes; bubble stays frozen

  assert.ok(s.lanes[1].done, 'quick should finish')
  assert.equal(s.lanes[0].done, false, 'paused bubble must not finish')
  assert.equal(s.lanes[0].finishOrder, 0)
})

test('resetLane rebuilds a single lane in place, leaving others untouched', () => {
  const s = makeSched(64, ['bubble', 'insertion'], 1)
  s.start()
  pump(3)
  const qC = s.lanes[1].stats.comparisons
  const qDone = s.lanes[1].done

  s.resetLane(0)
  assert.equal(s.lanes[0].done, false)
  assert.equal(s.lanes[0].paused, false)
  assert.equal(s.lanes[0].stats.comparisons, 0)
  assert.equal(s.lanes[0].stats.swaps, 0)
  assert.equal(s.lanes[0].stats.steps, 0)
  assert.equal(s.lanes[1].stats.comparisons, qC, 'other lane must keep its progress')
  assert.equal(s.lanes[1].done, qDone)
})

test('finishing lanes get distinct finishOrder 1..n and a set finishMs', () => {
  const s = makeSched(32, ['quick', 'merge', 'heap'], 1)
  s.start()
  pump(300)

  assert.ok(s.allDone)
  const orders = s.lanes.map((l) => l.finishOrder).sort((a, b) => a - b)
  assert.deepEqual(orders, [1, 2, 3])
  for (const l of s.lanes) {
    assert.ok(l.done)
    assert.ok(l.finishMs !== null && l.finishMs >= 0)
  }
})
