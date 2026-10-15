import { motion, useReducedMotion } from 'framer-motion'
import type { SortAlgorithm } from '../engine/types.ts'
import type { LaneRuntime } from '../scheduler.ts'
import { algoHue } from '../theme.ts'

/**
 * One race lane: header (identity dot, name, complexity, per-lane controls),
 * the bar canvas, and the live stat readout (re-rendered at ~4 Hz).
 */
export interface LanePanelProps {
  algo: SortAlgorithm
  /** Undefined until the scheduler exists for this render. */
  lane: LaneRuntime | undefined
  registerCanvas: (el: HTMLCanvasElement | null) => void
  onTogglePause: () => void
  onResetLane: () => void
}

function fmt(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function LanePanel({ algo, lane, registerCanvas, onTogglePause, onResetLane }: LanePanelProps) {
  const hue = algoHue(algo.id)
  const done = lane?.done ?? false
  const paused = lane?.paused ?? false
  const reduce = useReducedMotion()
  return (
    <motion.section
      className="rounded-2xl border border-edge bg-surface p-4"
      aria-label={`${algo.name} lane`}
      animate={
        done && !reduce
          ? { boxShadow: ['0 0 0 0px transparent', '0 0 0 2px var(--color-accent)', '0 0 0 0px transparent'] }
          : { boxShadow: '0 0 0 0px transparent' }
      }
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      <header className="mb-3 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: `hsl(${hue} 55% 55%)` }}
          aria-hidden
        />
        <h2 className="font-display text-sm font-semibold text-white">{algo.name}</h2>
        <span className="rounded-md bg-ink/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-mute">
          {algo.complexity.average}
        </span>
        {done && (
          <span className="text-xs font-semibold text-accent">
            ✓ #{lane?.finishOrder} · {fmt(lane?.finishMs ?? 0)} ms
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePause}
            disabled={done}
            aria-label={paused ? `Resume ${algo.name} lane` : `Pause ${algo.name} lane`}
            className="rounded-md border border-edge bg-ink/40 px-2 py-1 text-xs text-mute transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
          >
            {paused ? '▶' : '⏸'}
          </button>
          <button
            type="button"
            onClick={onResetLane}
            disabled={done}
            aria-label={`Reset ${algo.name} lane`}
            className="rounded-md border border-edge bg-ink/40 px-2 py-1 text-xs text-mute transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
          >
            ↺
          </button>
        </div>
      </header>

      <div className="h-40">
        <canvas
          ref={registerCanvas}
          className="h-full w-full"
          role="img"
          aria-label={`${algo.name} bar chart, ${done ? 'sorted' : 'sorting'}`}
        />
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <Stat label="comparisons" value={fmt(lane?.stats.comparisons ?? 0)} />
        <Stat label="swaps" value={fmt(lane?.stats.swaps ?? 0)} />
        <Stat label="writes" value={fmt(lane?.stats.writes ?? 0)} />
        <Stat label={done ? 'elapsed' : 'steps'} value={done ? `${fmt(lane?.finishMs ?? 0)} ms` : fmt(lane?.stats.steps ?? 0)} />
      </dl>
    </motion.section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-mute">{label}</dt>
      <dd className="tabular-nums text-slate-200">{value}</dd>
    </div>
  )
}
