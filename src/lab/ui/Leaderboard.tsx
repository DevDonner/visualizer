import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { SortAlgorithm, SortStats } from '../engine/types.ts'
import { algoHue } from '../theme.ts'

/**
 * The podium — shown when every lane has finished, ordered by finish time
 * with the final compare/swap/write counts. Dismissible (button or backdrop
 * click); the entrance animation is skipped under prefers-reduced-motion.
 */
export interface LeaderboardRow {
  algo: SortAlgorithm
  finishMs: number
  finishOrder: number
  stats: SortStats
}

export interface LeaderboardProps {
  rows: LeaderboardRow[]
  onDismiss: () => void
}

function fmt(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/** Milliseconds without performance.now() float noise (31.2, 256.2, …). */
function fmtMs(ms: number): string {
  return String(Math.round(ms * 10) / 10)
}

export function Leaderboard({ rows, onDismiss }: LeaderboardProps) {
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const ordered = [...rows].sort((a, b) => a.finishOrder - b.finishOrder)

  // Keyboard a11y (G6): take focus when opened, close on Escape. The dialog
  // is non-modal by design — background shortcuts (R to re-run) keep working.
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6"
      onClick={onDismiss}
    >
      <motion.div
        role="dialog"
        aria-label="Final leaderboard"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-edge bg-surface p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">Leaderboard</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onDismiss}
            aria-label="Close leaderboard"
            className="min-h-11 rounded-md border border-edge bg-ink/40 px-2 py-1 text-xs text-mute transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-accent sm:min-h-0"
          >
            ✕ Close
          </button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-mute">
              <th className="pb-2 pr-2 font-medium">rank</th>
              <th className="pb-2 pr-2 font-medium">algorithm</th>
              <th className="pb-2 pr-2 text-right font-medium">time</th>
              <th className="pb-2 pr-2 text-right font-medium">compares</th>
              <th className="pb-2 pr-2 text-right font-medium">swaps</th>
              <th className="pb-2 text-right font-medium">writes</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row, i) => (
              <tr key={row.algo.id} className="border-t border-edge">
                <td className="py-2 pr-2 font-mono text-mute">{i + 1}</td>
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-2 font-medium text-slate-200">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: `hsl(${algoHue(row.algo.id)} 55% 55%)` }}
                      aria-hidden
                    />
                    {row.algo.name}
                    {i === 0 && (
                      <span className="text-accent" title="winner">
                        ★
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-200">
                  {fmtMs(row.finishMs)} ms
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-200">
                  {fmt(row.stats.comparisons)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-200">
                  {fmt(row.stats.swaps)}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-200">{fmt(row.stats.writes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  )
}
