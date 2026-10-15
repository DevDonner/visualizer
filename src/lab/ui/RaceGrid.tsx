import { useEffect, useRef, useState } from 'react'
import type { SortAlgorithm } from '../engine/types.ts'
import { RaceScheduler, type ActionSink, type LaneInit } from '../scheduler.ts'
import { algoHue } from '../theme.ts'
import { LanePanel } from './LanePanel.tsx'

/**
 * The responsive race grid. Owns the canvas refs and the RaceScheduler
 * lifecycle: the scheduler is (re)created whenever the algorithm set or the
 * input data changes, and disposed on unmount (StrictMode-safe).
 *
 * Polls at ~4 Hz so the lane stat text stays fresh; the canvases themselves
 * are painted imperatively by the scheduler's rAF loop.
 */
export interface RaceGridProps {
  algos: SortAlgorithm[]
  data: number[]
  speed: number
  /** Optional action sink (sound engine); stable for the app's lifetime. */
  sound: ActionSink | null
  onScheduler: (s: RaceScheduler | null) => void
}

export function RaceGrid({ algos, data, speed, sound, onScheduler }: RaceGridProps) {
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>())
  const schedRef = useRef<RaceScheduler | null>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed

  useEffect(() => {
    const inits: LaneInit[] = []
    for (const algo of algos) {
      const canvas = canvasRefs.current.get(algo.id)
      if (canvas) inits.push({ algo, canvas, hue: algoHue(algo.id) })
    }
    if (inits.length === 0) {
      onScheduler(null)
      return
    }
    const sched = new RaceScheduler(data, inits, sound)
    sched.setSpeed(speedRef.current)
    schedRef.current = sched
    onScheduler(sched)

    const ro = new ResizeObserver(() => {
      for (const lane of sched.lanes) lane.renderer.resize()
      sched.paint()
    })
    for (const init of inits) ro.observe(init.canvas)

    return () => {
      ro.disconnect()
      sched.dispose()
      schedRef.current = null
      onScheduler(null)
    }
    // onScheduler (root useCallback) and sound (root ref) are stable —
    // deliberately excluded from deps.
  }, [algos, data])

  useEffect(() => {
    schedRef.current?.setSpeed(speed)
  }, [speed])

  // 4 Hz stat re-render (canvas painting is rAF-driven, not React-driven).
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 250)
    return () => window.clearInterval(t)
  }, [])

  const sched = schedRef.current

  if (algos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge bg-surface/40 p-12 text-center text-sm text-mute">
        Pick at least one algorithm above to start the race.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Race grid">
      {algos.map((algo, i) => (
        <LanePanel
          key={algo.id}
          algo={algo}
          lane={sched?.lanes[i]}
          registerCanvas={(el) => {
            if (el) canvasRefs.current.set(algo.id, el)
            else canvasRefs.current.delete(algo.id)
          }}
          onTogglePause={() => schedRef.current?.togglePauseLane(i)}
          onResetLane={() => schedRef.current?.resetLane(i)}
        />
      ))}
    </div>
  )
}
