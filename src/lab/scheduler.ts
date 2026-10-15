/**
 * RaceScheduler — one rAF loop driving every lane in lockstep.
 *
 * Each frame, every not-finished lane gets a step budget of
 * `BASE_BUDGET × speed` actions. The scheduler consumes the runners' action
 * streams, derives stats via the engine's `countAction` (same code path as
 * the test driver — one source of truth), maintains each lane's visual
 * frame state, and repaints the canvases. When the last lane finishes the
 * loop stops itself (the UI shows the leaderboard / done states).
 *
 * Framework-agnostic: React (P4) owns lifecycle via start/stop/reset.
 */
import type { Action, SortAlgorithm, SortStats, SortRunner } from './engine/types.ts'
import { countAction } from './engine/run.ts'
import { LaneRenderer, createFrameState, type LaneFrameState } from './render/renderer.ts'

/** Actions per lane per frame at speed 1 (≈ 1 440/s at 60 fps). */
export const BASE_BUDGET = 24

export interface LaneInit {
  algo: SortAlgorithm
  canvas: HTMLCanvasElement
  hue: number
}

export interface LaneRuntime {
  algo: SortAlgorithm
  renderer: LaneRenderer
  /** Live stats — mutated in place, safe to read from React at ~4 Hz. */
  stats: SortStats
  /** True once the lane emitted `done`. */
  done: boolean
  /** 1-based finish position; 0 while running. */
  finishOrder: number
}

function freshStats(): SortStats {
  return { comparisons: 0, swaps: 0, writes: 0, steps: 0 }
}

function zeroStats(s: SortStats): void {
  s.comparisons = 0
  s.swaps = 0
  s.writes = 0
  s.steps = 0
}

export class RaceScheduler {
  readonly lanes: LaneRuntime[]
  private readonly runners: SortRunner[]
  private readonly frameStates: LaneFrameState[]
  private readonly data: number[]
  private raf = 0
  private isRunning = false
  private speed = 1
  private finishedCount = 0

  constructor(data: number[], inits: LaneInit[]) {
    this.data = data
    this.lanes = inits.map((init) => ({
      algo: init.algo,
      renderer: new LaneRenderer(init.canvas, init.hue),
      stats: freshStats(),
      done: false,
      finishOrder: 0,
    }))
    this.runners = []
    this.frameStates = []
    this.reset()
  }

  get running(): boolean {
    return this.isRunning
  }

  get allDone(): boolean {
    return this.lanes.every((l) => l.done)
  }

  /** Begin (or resume) the race. No-op when already running or all done. */
  start(): void {
    if (this.isRunning || this.allDone) return
    this.isRunning = true
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Pause the race (canvases keep their last frame). */
  stop(): void {
    this.isRunning = false
    cancelAnimationFrame(this.raf)
  }

  /** Release the rAF loop (idempotent — call on unmount). */
  dispose(): void {
    this.stop()
  }

  /** Speed multiplier; clamped to a sane range. */
  setSpeed(mult: number): void {
    this.speed = Math.min(64, Math.max(0.1, mult))
  }

  getSpeed(): number {
    return this.speed
  }

  /** One action per lane — the manual Step control (works while paused). */
  stepOnce(): void {
    if (this.allDone) return
    for (let li = 0; li < this.lanes.length; li++) {
      const lane = this.lanes[li]
      if (lane.done) continue
      const a = this.runners[li].step()
      if (a === null) continue
      countAction(lane.stats, a)
      this.applyAction(lane, this.frameStates[li], a)
    }
    this.paintAll()
  }

  /** Repaint every lane from its current state (e.g. after a canvas resize). */
  paint(): void {
    this.paintAll()
  }

  /** Stop and rebuild every runner from the shared input data. */
  reset(): void {
    this.stop()
    for (let li = 0; li < this.lanes.length; li++) {
      this.runners[li] = this.lanes[li].algo.create(this.data)
      this.frameStates[li] = createFrameState(this.data.length)
      zeroStats(this.lanes[li].stats)
      this.lanes[li].done = false
      this.lanes[li].finishOrder = 0
    }
    this.finishedCount = 0
    this.paintAll()
  }

  private paintAll(): void {
    for (let li = 0; li < this.lanes.length; li++) {
      this.lanes[li].renderer.draw(this.runners[li].values(), this.frameStates[li])
    }
  }

  private applyAction(lane: LaneRuntime, fs: LaneFrameState, a: Action): void {
    switch (a.kind) {
      case 'compare':
      case 'swap':
        fs.hi1 = a.i
        fs.hi2 = a.j
        break
      case 'write':
        fs.hi1 = a.i
        fs.hi2 = -1
        break
      case 'pivot':
        fs.pivot = a.i
        break
      case 'range':
        fs.range = { lo: a.lo, hi: a.hi }
        break
      case 'sorted':
        fs.sorted[a.i] = 1
        break
      case 'done':
        lane.done = true
        lane.finishOrder = ++this.finishedCount
        fs.hi1 = -1
        fs.hi2 = -1
        fs.pivot = -1
        fs.range = null
        fs.done = true
        break
    }
  }

  private readonly tick = (): void => {
    if (!this.isRunning) return
    const budget = Math.max(1, Math.round(BASE_BUDGET * this.speed))
    let anyActive = false
    for (let li = 0; li < this.lanes.length; li++) {
      const lane = this.lanes[li]
      if (lane.done) continue
      anyActive = true
      const runner = this.runners[li]
      const fs = this.frameStates[li]
      let used = 0
      while (used < budget) {
        const a = runner.step()
        if (a === null) break
        countAction(lane.stats, a)
        this.applyAction(lane, fs, a)
        used++
        if (lane.done) break
      }
    }
    this.paintAll()
    if (anyActive) {
      this.raf = requestAnimationFrame(this.tick)
    } else {
      this.isRunning = false
    }
  }
}
