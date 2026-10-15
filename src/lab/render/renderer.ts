/**
 * Per-lane canvas renderer — DPR-aware, single-pass, batched.
 *
 * One `draw()` per lane per frame: clear, then one loop over all bars that
 * picks each bar's style from a small set of precomputed color strings
 * (style changes only on state boundaries → cheap). Highlights (compare /
 * swap / write / pivot) are resolved inside the same loop, so there are no
 * per-frame allocations beyond the input iteration.
 */

/** Visual state for one lane, derived by the scheduler from the action stream. */
export interface LaneFrameState {
  /** Primary highlight index (compare i / swap i / write target). */
  hi1: number
  /** Secondary highlight index (compare j / swap j). */
  hi2: number
  /** Current pivot / min position, or -1. */
  pivot: number
  /** Active sub-range; bars outside are dimmed. */
  range: { lo: number; hi: number } | null
  /** 1 at positions confirmed in their final place. */
  sorted: Uint8Array
  /** Lane finished — everything settles into the done tone. */
  done: boolean
}

export function createFrameState(n: number): LaneFrameState {
  return { hi1: -1, hi2: -1, pivot: -1, range: null, sorted: new Uint8Array(n), done: false }
}

/** Portfolio accent (teal) — compare/swap/write highlights. */
const ACCENT = '#5eead4'
/** Pivot / min marker — the portfolio's amber signal color. */
const PIVOT_COLOR = '#fbbf24'

export class LaneRenderer {
  private readonly ctx: CanvasRenderingContext2D
  private cssW = 0
  private cssH = 0
  private readonly base: string
  private readonly dim: string
  private readonly sortedColor: string
  private readonly doneColor: string

  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, hue: number) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d canvas context unavailable')
    this.ctx = ctx
    const h = Math.round(hue)
    this.base = `hsl(${h} 34% 44%)`
    this.dim = `hsl(${h} 16% 22%)`
    this.sortedColor = 'hsl(168 55% 42%)'
    this.doneColor = 'hsl(168 45% 32%)'
    this.resize()
  }

  /** Match the backing store to the element's CSS size × devicePixelRatio. */
  resize(): void {
    const dpr = window.devicePixelRatio || 1
    this.cssW = this.canvas.clientWidth
    this.cssH = this.canvas.clientHeight
    this.canvas.width = Math.max(1, Math.round(this.cssW * dpr))
    this.canvas.height = Math.max(1, Math.round(this.cssH * dpr))
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /** Paint one frame: `values` are the lane's current array (values in [0, 1]). */
  draw(values: number[], s: LaneFrameState): void {
    const { ctx } = this
    const n = values.length
    if (n === 0 || this.cssW < 2 || this.cssH < 4) return
    ctx.clearRect(0, 0, this.cssW, this.cssH)

    const slot = this.cssW / n
    const barW = Math.max(1, slot - (slot >= 4 ? 1 : 0))
    const padBottom = 2
    const maxH = this.cssH - padBottom - 2
    const done = s.done
    const hi1 = done ? -1 : s.hi1
    const hi2 = done ? -1 : s.hi2
    const pivot = done ? -1 : s.pivot
    const range = done ? null : s.range

    let current = ''
    for (let i = 0; i < n; i++) {
      let style: string
      if (i === hi1 || i === hi2) style = ACCENT
      else if (i === pivot) style = PIVOT_COLOR
      else if (done || s.sorted[i]) style = done ? this.doneColor : this.sortedColor
      else if (range !== null && (i < range.lo || i > range.hi)) style = this.dim
      else style = this.base
      if (style !== current) {
        ctx.fillStyle = style
        current = style
      }
      const h = Math.max(2, values[i] * maxH)
      ctx.fillRect(Math.round(i * slot), this.cssH - padBottom - h, barW, h)
    }
  }
}
