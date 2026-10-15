import { useEffect, useRef, useState } from 'react'
import { meta } from './meta.ts'
import { ALGORITHMS } from './engine/registry.ts'
import { makeData } from './engine/data.ts'
import { RaceScheduler, type LaneInit } from './scheduler.ts'
import { algoHue } from './theme.ts'

/**
 * SortLab — the lab's root component.
 *
 * Contract (portfolio LABS.md): default export, takes no props, fills its
 * container, and imports nothing from the site shell — the folder must be
 * liftable into `portfolio/src/labs/<slug>/` with zero changes.
 *
 * P3 demo root: a fixed 4-lane race driving the renderer + scheduler so the
 * animation path can be verified in a real browser. P4 replaces this with
 * the full control panel + algorithm picker + dynamic race grid.
 */
const DEMO_ALGOS = ['bubble', 'selection', 'quick', 'timsort']
const DEMO_N = 128
const DEMO_SPEED = 8

function fmt(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function SortLab() {
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>())
  const schedRef = useRef<RaceScheduler | null>(null)
  const [running, setRunning] = useState(false)
  const [, setTick] = useState(0) // 4 Hz stat re-render (canvas itself is rAF-driven)

  useEffect(() => {
    const inits: LaneInit[] = []
    for (const id of DEMO_ALGOS) {
      const algo = ALGORITHMS.find((a) => a.id === id)
      const canvas = canvasRefs.current.get(id)
      if (!algo || !canvas) return
      inits.push({ algo, canvas, hue: algoHue(id) })
    }
    const sched = new RaceScheduler(makeData(DEMO_N, 'random', 42), inits)
    sched.setSpeed(DEMO_SPEED)
    schedRef.current = sched

    const ro = new ResizeObserver(() => {
      for (const lane of sched.lanes) lane.renderer.resize()
      sched.paint()
    })
    for (const init of inits) ro.observe(init.canvas)

    const timer = window.setInterval(() => {
      setRunning(sched.running)
      setTick((t) => t + 1)
    }, 250)

    return () => {
      ro.disconnect()
      window.clearInterval(timer)
      sched.dispose()
      schedRef.current = null
    }
  }, [])

  const sched = schedRef.current

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-edge px-6 py-4">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight text-white">
            {meta.title}
          </h1>
          <p className="text-xs text-mute">{meta.tagline}</p>
        </div>
        <span className="rounded-full border border-edge bg-surface px-3 py-1 text-[11px] uppercase tracking-widest text-mute">
          {meta.mode}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-edge px-6 py-3">
        <button
          type="button"
          onClick={() => {
            if (!sched) return
            if (sched.running) sched.stop()
            else sched.start()
          }}
          className="rounded-lg border border-edge bg-surface px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-accent/60 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
        >
          {running ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => sched?.stepOnce()}
          disabled={running}
          className="rounded-lg border border-edge bg-surface px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-accent/60 hover:text-white focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            sched?.reset()
            setRunning(false)
          }}
          className="rounded-lg border border-edge bg-surface px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-accent/60 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
        >
          Reset
        </button>
        <span className="text-xs text-mute">
          {DEMO_ALGOS.length} lanes · n={DEMO_N} · speed ×{DEMO_SPEED}
        </span>
      </div>

      <main className="grid flex-1 auto-rows-min grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
        {DEMO_ALGOS.map((id, i) => {
          const algo = ALGORITHMS.find((a) => a.id === id)
          const lane = sched?.lanes[i]
          if (!algo) return null
          return (
            <section key={id} className="rounded-2xl border border-edge bg-surface p-4">
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: `hsl(${algoHue(id)} 60% 55%)` }}
                    aria-hidden
                  />
                  <h2 className="font-display text-sm font-semibold text-white">{algo.name}</h2>
                </div>
                {lane?.done ? (
                  <span className="text-xs font-semibold text-accent">✓ #{lane.finishOrder}</span>
                ) : (
                  <span className="text-[11px] tabular-nums text-mute">
                    {fmt(lane?.stats.steps ?? 0)} steps
                  </span>
                )}
              </header>
              <div className="h-44">
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(id, el)
                    else canvasRefs.current.delete(id)
                  }}
                  className="h-full w-full"
                  role="img"
                  aria-label={`${algo.name} bar chart`}
                />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <dt className="text-mute">comparisons</dt>
                  <dd className="tabular-nums text-slate-200">{fmt(lane?.stats.comparisons ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-mute">swaps</dt>
                  <dd className="tabular-nums text-slate-200">{fmt(lane?.stats.swaps ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-mute">writes</dt>
                  <dd className="tabular-nums text-slate-200">{fmt(lane?.stats.writes ?? 0)}</dd>
                </div>
              </dl>
            </section>
          )
        })}
      </main>
    </div>
  )
}
