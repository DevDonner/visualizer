import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Distribution } from './engine/types.ts'
import { ALGORITHMS } from './engine/registry.ts'
import { makeData } from './engine/data.ts'
import { radixKey } from './engine/algorithms/radix.ts'
import type { RaceScheduler } from './scheduler.ts'
import { SoundEngine, type SoundMode } from './audio/engine.ts'
import {
  DEFAULT_DIST,
  DEFAULT_SELECTED,
  DEFAULT_SIZE_IDX,
  DEFAULT_SPEED_IDX,
  SIZE_STOPS,
  SPEED_STOPS,
} from './ui/constants.ts'
import { AlgoPicker } from './ui/AlgoPicker.tsx'
import { ControlPanel } from './ui/ControlPanel.tsx'
import { RaceGrid } from './ui/RaceGrid.tsx'
import { Leaderboard } from './ui/Leaderboard.tsx'
import { parseUrlState, serializeUrlState } from './ui/urlState.ts'
import { meta } from './meta.ts'

/** Read the initial configuration from the URL (shareable / reproducible race). */
function initConfig() {
  if (typeof window === 'undefined') return null
  return parseUrlState(window.location.search)
}

/**
 * SortLab — the lab's root component.
 *
 * Contract (portfolio LABS.md): default export, takes no props, fills its
 * container, and imports nothing from the site shell — the folder must be
 * liftable into `portfolio/src/labs/<slug>/` with zero changes.
 *
 * Owns the race configuration (algorithm set, data size/shape/seed, speed)
 * plus the sound engine, the podium, the keyboard shortcuts, and the URL
 * state; the RaceGrid owns the canvases + scheduler. This component polls at
 * 4 Hz only to keep the transport button state honest (the scheduler stops
 * its rAF loop on its own when the race ends).
 */

export default function SortLab() {
  const [urlInit] = useState(initConfig)
  const [selectedKey, setSelectedKey] = useState(urlInit?.algos ?? DEFAULT_SELECTED.join(','))
  const [sizeIdx, setSizeIdx] = useState(() => {
    const n = urlInit?.n
    return n != null && (SIZE_STOPS as readonly number[]).includes(n)
      ? (SIZE_STOPS as readonly number[]).indexOf(n)
      : DEFAULT_SIZE_IDX
  })
  const [dist, setDist] = useState<Distribution>(urlInit?.dist ?? DEFAULT_DIST)
  const [seed, setSeed] = useState(urlInit?.seed ?? 42)
  const [speedIdx, setSpeedIdx] = useState(() => {
    const s = urlInit?.speed
    return s != null && (SPEED_STOPS as readonly number[]).includes(s)
      ? (SPEED_STOPS as readonly number[]).indexOf(s)
      : DEFAULT_SPEED_IDX
  })

  // Keep the URL in sync so any race is shareable / reproducible.
  // replaceState avoids history spam (no back-button churn while tuning).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const qs = serializeUrlState({ selectedKey, sizeIdx, dist, seed, speedIdx })
    if (window.location.search !== `?${qs}`) {
      window.history.replaceState(null, '', `${window.location.pathname}?${qs}`)
    }
  }, [selectedKey, sizeIdx, dist, seed, speedIdx])

  // Sound — the engine outlives scheduler (re)creations; its AudioContext is
  // created lazily inside the enable gesture (autoplay-policy safe) and
  // re-created on demand after dispose (StrictMode-safe).
  const soundRef = useRef<SoundEngine | null>(null)
  if (soundRef.current === null) soundRef.current = new SoundEngine()
  const [soundOn, setSoundOn] = useState(false)
  const [volume, setVolume] = useState(60) // 0..100
  const [soundMode, setSoundMode] = useState<SoundMode>('both')
  useEffect(() => () => soundRef.current?.dispose(), [])

  // Leaderboard dismissal — re-armed deterministically when a new race begins
  // (scheduler (re)creation or explicit reset), never by sampling allDone at
  // 4 Hz (a fast race can finish between samples and skip the re-arm).
  const [lbDismissed, setLbDismissed] = useState(false)

  const selected = useMemo(
    () => new Set(selectedKey ? selectedKey.split(',') : []),
    [selectedKey],
  )
  const algos = useMemo(() => ALGORITHMS.filter((a) => selected.has(a.id)), [selected])
  const data = useMemo(() => makeData(SIZE_STOPS[sizeIdx], dist, seed), [sizeIdx, dist, seed])

  const schedRef = useRef<RaceScheduler | null>(null)
  const onScheduler = useCallback((s: RaceScheduler | null) => {
    schedRef.current = s
    if (s) setLbDismissed(false) // a (re)created scheduler = a new race: re-arm the podium
  }, [])

  // Transport callbacks — stable, so the keyboard-shortcut effect mounts once
  // and the ControlPanel can use them without re-render pressure.
  const toggleRun = useCallback(() => {
    const s = schedRef.current
    if (!s) return
    if (s.running) s.stop()
    else s.start()
  }, [])
  const resetAll = useCallback(() => {
    schedRef.current?.reset()
    setLbDismissed(false) // explicit reset = new race: re-arm the podium
  }, [])
  const soundOnRef = useRef(false)
  soundOnRef.current = soundOn
  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current
    soundRef.current?.setEnabled(next) // runs inside a user gesture (click/keydown)
    setSoundOn(next)
  }, [])
  const bumpSpeed = useCallback((delta: number) => {
    setSpeedIdx((i) => Math.min(SPEED_STOPS.length - 1, Math.max(0, i + delta)))
  }, [])

  // Keyboard shortcuts: Space play/pause · R reset · S sound · ↑/↓ speed.
  // Skipped while a form field is focused (sliders own the arrow keys), and
  // Space on a focused button keeps its native activation behavior.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement ||
          t.isContentEditable)
      )
        return
      if (e.key === ' ') {
        if (t instanceof HTMLButtonElement) return
        e.preventDefault()
        toggleRun()
      } else if (e.key === 'r' || e.key === 'R') {
        resetAll()
      } else if (e.key === 's' || e.key === 'S') {
        toggleSound()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        bumpSpeed(1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        bumpSpeed(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleRun, resetAll, toggleSound, bumpSpeed])

  // 4 Hz tick keeps `running` in sync once the scheduler ends the race on its own.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 250)
    return () => window.clearInterval(t)
  }, [])

  const running = schedRef.current?.running ?? false
  const allDone = schedRef.current?.allDone ?? false

  // Screen-reader status (aria-live announces when the text changes, which
  // happens at the 4 Hz tick: start, each lane finish, completion, reset).
  const finishedLanes = schedRef.current?.lanes.filter((l) => l.done).length ?? 0
  const statusText = allDone
    ? `Race complete — all ${algos.length} lanes sorted.`
    : running
      ? `Race running — ${finishedLanes} of ${algos.length} lanes finished.`
      : 'Ready — press Play or Space to start.'

  // Debug seam (PLAN §8) — assert "all lanes done + bars sorted" without pixels.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as Record<string, unknown>
    w.__SORTLAB__ = {
      getState: () => {
        const s = schedRef.current
        return {
          running: s?.running ?? false,
          allDone: s?.allDone ?? false,
          lanes:
            s?.lanes.map((l) => ({
              algo: l.algo.id,
              done: l.done,
              paused: l.paused,
              finishOrder: l.finishOrder,
              finishMs: l.finishMs,
              stats: { ...l.stats },
            })) ?? [],
        }
      },
      forceStepAll: () => {
        schedRef.current?.stepOnce()
      },
      snapshot: () => {
        const s = schedRef.current
        if (!s) return null
        return {
          allDone: s.allDone,
          lanes: s.lanes.map((l, i) => {
            const v = s.laneValues(i)
            let sorted = true
            // radix sorts by 16-bit key, not exact double order (documented
            // contract) — check both, per lane.
            let sortedByKey = true
            for (let k = 1; k < v.length; k++) {
              if (v[k - 1] > v[k]) sorted = false
              if (radixKey(v[k - 1]) > radixKey(v[k])) sortedByKey = false
              if (!sorted && !sortedByKey) break
            }
            const contract = l.algo.id === 'radix' ? sortedByKey : sorted
            return { algo: l.algo.id, done: l.done, sorted, sortedByKey, contract, stats: { ...l.stats } }
          }),
        }
      },
    }
    return () => {
      delete w.__SORTLAB__
    }
  }, [])

  const toggleAlgo = useCallback((id: string) => {
    setSelectedKey((prev) => {
      const set = new Set(prev ? prev.split(',') : [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return [...set].join(',')
    })
  }, [])

  const shuffle = useCallback(() => {
    setSeed(1 + Math.floor(Math.random() * 99998))
  }, [])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div role="status" aria-live="polite" className="sr-only">
        {statusText}
      </div>
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

      <ControlPanel
        running={running}
        allDone={allDone}
        hasLanes={algos.length > 0}
        onPlayPause={toggleRun}
        onStep={() => schedRef.current?.stepOnce()}
        onReset={resetAll}
        sizeIdx={sizeIdx}
        onSizeIdx={setSizeIdx}
        dist={dist}
        onDist={setDist}
        seed={seed}
        onShuffle={shuffle}
        speedIdx={speedIdx}
        onSpeedIdx={setSpeedIdx}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        volume={volume}
        onVolume={(v) => {
          soundRef.current?.setVolume(v / 100)
          setVolume(v)
        }}
        soundMode={soundMode}
        onSoundMode={(m) => {
          soundRef.current?.setMode(m)
          setSoundMode(m)
        }}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] space-y-6 p-6">
          <AlgoPicker selected={selected} onToggle={toggleAlgo} />
          <RaceGrid
            algos={algos}
            data={data}
            speed={SPEED_STOPS[speedIdx]}
            sound={soundRef.current}
            onScheduler={onScheduler}
          />
        </div>
      </div>

      {allDone && !lbDismissed && schedRef.current && (
        <Leaderboard
          rows={schedRef.current.lanes
            .filter((l) => l.done)
            .map((l) => ({
              algo: l.algo,
              finishMs: l.finishMs ?? 0,
              finishOrder: l.finishOrder,
              stats: l.stats,
            }))}
          onDismiss={() => setLbDismissed(true)}
        />
      )}
    </div>
  )
}
