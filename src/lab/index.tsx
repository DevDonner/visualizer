import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Distribution } from './engine/types.ts'
import { ALGORITHMS } from './engine/registry.ts'
import { makeData } from './engine/data.ts'
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
import { meta } from './meta.ts'

/**
 * SortLab — the lab's root component.
 *
 * Contract (portfolio LABS.md): default export, takes no props, fills its
 * container, and imports nothing from the site shell — the folder must be
 * liftable into `portfolio/src/labs/<slug>/` with zero changes.
 *
 * Owns the race configuration (algorithm set, data size/shape/seed, speed);
 * the RaceGrid owns the canvases + scheduler. This component polls at 4 Hz
 * only to keep the transport button state honest (the scheduler stops its
 * rAF loop on its own when the race ends).
 */
export default function SortLab() {
  const [selectedKey, setSelectedKey] = useState(DEFAULT_SELECTED.join(','))
  const [sizeIdx, setSizeIdx] = useState(DEFAULT_SIZE_IDX)
  const [dist, setDist] = useState<Distribution>(DEFAULT_DIST)
  const [seed, setSeed] = useState(42)
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED_IDX)

  // Sound — the engine outlives scheduler (re)creations; its AudioContext is
  // created lazily inside the enable gesture (autoplay-policy safe) and
  // re-created on demand after dispose (StrictMode-safe).
  const soundRef = useRef<SoundEngine | null>(null)
  if (soundRef.current === null) soundRef.current = new SoundEngine()
  const [soundOn, setSoundOn] = useState(false)
  const [volume, setVolume] = useState(60) // 0..100
  const [soundMode, setSoundMode] = useState<SoundMode>('both')
  useEffect(() => () => soundRef.current?.dispose(), [])

  const selected = useMemo(
    () => new Set(selectedKey ? selectedKey.split(',') : []),
    [selectedKey],
  )
  const algos = useMemo(() => ALGORITHMS.filter((a) => selected.has(a.id)), [selected])
  const data = useMemo(() => makeData(SIZE_STOPS[sizeIdx], dist, seed), [sizeIdx, dist, seed])

  const schedRef = useRef<RaceScheduler | null>(null)
  const onScheduler = useCallback((s: RaceScheduler | null) => {
    schedRef.current = s
  }, [])

  // 4 Hz tick keeps `running` in sync once the scheduler ends the race on its own.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 250)
    return () => window.clearInterval(t)
  }, [])

  const running = schedRef.current?.running ?? false
  const allDone = schedRef.current?.allDone ?? false

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
        onPlayPause={() => {
          const s = schedRef.current
          if (!s) return
          if (s.running) s.stop()
          else s.start()
        }}
        onStep={() => schedRef.current?.stepOnce()}
        onReset={() => schedRef.current?.reset()}
        sizeIdx={sizeIdx}
        onSizeIdx={setSizeIdx}
        dist={dist}
        onDist={setDist}
        seed={seed}
        onShuffle={shuffle}
        speedIdx={speedIdx}
        onSpeedIdx={setSpeedIdx}
        soundOn={soundOn}
        onToggleSound={() => {
          const next = !soundOn
          soundRef.current?.setEnabled(next) // inside the click gesture
          setSoundOn(next)
        }}
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
    </div>
  )
}
