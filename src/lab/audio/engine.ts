/**
 * SoundEngine — fully synthesized Web Audio (no assets, no network).
 *
 * Design (PLAN.md §2):
 *  - The AudioContext is created/resumed only inside the enable gesture
 *    (autoplay-policy safe) and suspended when disabled.
 *  - A bar's value maps onto a C-major pentatonic scale, so the sound is always
 *    consonant; per-lane pitch offset keeps simultaneous blips from stacking.
 *  - Compare = quiet sine blip, swap = louder triangle blip, lane finish = a
 *    small ascending arpeggio. Exponential-decay envelopes, a shared low-pass,
 *    and a master gain (fixed at 15% output — the whole engine is -85% loudness).
 *  - Rate-limited to a handful of notes per frame so a fast race becomes a
 *    texture rather than a wall of clicks.
 *  - Disabling mid-run (or disposing) never throws and leaves no dangling nodes:
 *    every scheduled source self-disconnects on `ended`.
 *
 * Framework-agnostic: the scheduler pushes the action stream to it via the
 * `ActionSink` interface (see scheduler.ts). `freqForValue` is a pure export
 * so the musical mapping is unit-testable in node without any DOM/Web Audio.
 */
import type { Action } from '../engine/types.ts'

/** C-major pentatonic, semitone offsets within one octave. */
const PENTA = [0, 2, 4, 7, 9]
/** Octaves of the scale spanned by a single bar's [0, 1] value. */
const OCTAVES = 3
/** Total discrete scale degrees a value can hit (5 per octave). */
const STEPS = PENTA.length * OCTAVES
/** Lowest root of the scale (A3). */
const BASE_HZ = 220
/** Max notes scheduled per rAF frame (rate limit). */
const FRAME_CAP = 24
/**
 * Fixed master attenuation: the whole engine outputs at 15% of its original
 * level (-85%; second pass 2026-10-17 — 30% was still too loud). Applied to
 * the master gain, so every note, arpeggio and slider position scales down
 * uniformly.
 */
const MASTER_ATTENUATION = 0.15

/** Per-lane semitone offset (bounded to one octave) so lanes don't pitch-clash. */
function laneOffset(li: number): number {
  return (li * 5) % 12
}

/**
 * Map a bar value in [0, 1] to a pentatonic frequency, with a per-lane offset.
 * Pure — safe to call in node. Higher value → higher pitch; adjacent scale
 * degrees keep the sweep smooth.
 */
export function freqForValue(value: number, li = 0): number {
  const v = Math.max(0, Math.min(1, value))
  const k = Math.floor(v * STEPS) // 0..STEPS
  const clamped = Math.max(0, Math.min(STEPS - 1, k))
  const semis = Math.floor(clamped / PENTA.length) * 12 + PENTA[clamped % PENTA.length]
  return BASE_HZ * Math.pow(2, (semis + laneOffset(li)) / 12)
}

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private lowpass: BiquadFilterNode | null = null
  private enabled = false
  private volume = 0.25 // default — matches the UI slider default (25%)
  private frameNotes = 0

  get isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Enable (create/resume the context — call from a user gesture) or disable
   * (suspend). Idempotent and throw-safe.
   */
  setEnabled(on: boolean): void {
    this.enabled = on
    if (on) {
      this.ensureGraph()
      if (this.ctx) void this.ctx.resume().catch(() => undefined)
      this.applyVolume()
    } else if (this.ctx) {
      void this.ctx.suspend().catch(() => undefined)
    }
  }

  /** Master volume, 0..1 (stored even before the context exists). */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    this.applyVolume()
  }

  /** Reset the per-frame note budget. Scheduler calls once per rAF frame. */
  beginFrame(): void {
    this.frameNotes = 0
  }

  /** Consume one action; schedule a blip if enabled and under the frame cap. */
  onAction(li: number, a: Action, value: number): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return
    if (this.frameNotes >= FRAME_CAP) return
    if (a.kind === 'compare') {
      this.frameNotes += 1
      this.blip('sine', value, li, 0.14, 0.05)
    } else if (a.kind === 'swap') {
      this.frameNotes += 1
      this.blip('triangle', value, li, 0.26, 0.07)
    } else if (a.kind === 'done') {
      this.frameNotes += 3
      this.arpeggio(li)
    }
  }

  /** Close the context and drop the graph (StrictMode-safe teardown). */
  dispose(): void {
    this.enabled = false
    if (this.ctx) void this.ctx.close().catch(() => undefined)
    this.ctx = null
    this.master = null
    this.lowpass = null
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.volume * MASTER_ATTENUATION
  }

  /** Lazily build `osc → env → lowpass → master → destination`. */
  private ensureGraph(): void {
    if (this.ctx) return
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = this.volume * MASTER_ATTENUATION
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 4200
    lowpass.Q.value = 0.7
    lowpass.connect(master)
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.lowpass = lowpass
  }

  /** A short, quiet, exponentially-decaying blip at a pentatonic pitch. */
  private blip(type: OscillatorType, value: number, li: number, peak: number, dur: number): void {
    const { ctx, lowpass } = this
    if (!ctx || !lowpass) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freqForValue(value, li)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, now)
    env.gain.exponentialRampToValueAtTime(peak, now + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.connect(env)
    env.connect(lowpass)
    osc.start(now)
    osc.stop(now + dur + 0.02)
    osc.onended = () => {
      osc.disconnect()
      env.disconnect()
    }
  }

  /** Small ascending triad (C-E-G) rooted on the lane's offset — the finish cue. */
  private arpeggio(li: number): void {
    const { ctx, lowpass } = this
    if (!ctx || !lowpass) return
    const now = ctx.currentTime
    for (const [i, semis] of [0, 4, 7].entries()) {
      const t = now + i * 0.07
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = BASE_HZ * Math.pow(2, (semis + laneOffset(li)) / 12)
      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, t)
      env.gain.exponentialRampToValueAtTime(0.22, t + 0.01)
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
      osc.connect(env)
      env.connect(lowpass)
      osc.start(t)
      osc.stop(t + 0.3)
      osc.onended = () => {
        osc.disconnect()
        env.disconnect()
      }
    }
  }
}
