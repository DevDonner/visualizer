import { memo, type ReactNode } from 'react'
import type { Distribution } from '../engine/types.ts'
import { DISTRIBUTIONS } from '../engine/data.ts'
import type { SoundMode } from '../audio/engine.ts'
import { SIZE_STOPS, SPEED_STOPS } from './constants.ts'

const SOUND_MODES: readonly SoundMode[] = ['compare', 'swap', 'both']

/**
 * Global transport + race configuration. Re-rendered by the 4 Hz stat tick,
 * so it stays memo-friendly: only primitive props.
 */
export interface ControlPanelProps {
  running: boolean
  allDone: boolean
  hasLanes: boolean
  onPlayPause: () => void
  onStep: () => void
  onReset: () => void
  sizeIdx: number
  onSizeIdx: (i: number) => void
  dist: Distribution
  onDist: (d: Distribution) => void
  seed: number
  onShuffle: () => void
  speedIdx: number
  onSpeedIdx: (i: number) => void
  soundOn: boolean
  onToggleSound: () => void
  /** Master volume, 0..100. */
  volume: number
  onVolume: (v: number) => void
  soundMode: SoundMode
  onSoundMode: (m: SoundMode) => void
}

export const ControlPanel = memo(function ControlPanel(p: ControlPanelProps) {
  const btn =
    'rounded-lg border border-edge bg-surface px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-accent/60 hover:text-white focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40'
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-edge px-6 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={p.onPlayPause}
          disabled={!p.hasLanes || p.allDone}
          aria-label={p.running ? 'Pause all lanes' : 'Play all lanes'}
        >
          {p.running ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className={btn}
          onClick={p.onStep}
          disabled={p.running || p.allDone || !p.hasLanes}
          aria-label="Step one action in every lane"
        >
          Step
        </button>
        <button type="button" className={btn} onClick={p.onReset} disabled={!p.hasLanes}>
          Reset
        </button>
      </div>

      <LabeledGroup label="data">
        <input
          type="range"
          min={0}
          max={SIZE_STOPS.length - 1}
          step={1}
          value={p.sizeIdx}
          onChange={(e) => p.onSizeIdx(Number(e.target.value))}
          className="w-32 accent-accent"
          aria-label={`Data size: ${SIZE_STOPS[p.sizeIdx]} elements`}
        />
        <span className="w-12 text-xs tabular-nums text-slate-200">n={SIZE_STOPS[p.sizeIdx]}</span>
      </LabeledGroup>

      <LabeledGroup label="shape">
        <div className="flex overflow-hidden rounded-lg border border-edge" role="group" aria-label="Data distribution">
          {DISTRIBUTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => p.onDist(d.id)}
              aria-pressed={p.dist === d.id}
              title={d.hint}
              className={`px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 ${
                p.dist === d.id
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-mute hover:text-slate-200'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </LabeledGroup>

      <LabeledGroup label="seed">
        <span className="w-10 text-right text-xs tabular-nums text-slate-200">{p.seed}</span>
        <button type="button" className={btn} onClick={p.onShuffle} aria-label="Shuffle to a new random seed">
          Shuffle
        </button>
      </LabeledGroup>

      <LabeledGroup label="speed">
        <input
          type="range"
          min={0}
          max={SPEED_STOPS.length - 1}
          step={1}
          value={p.speedIdx}
          onChange={(e) => p.onSpeedIdx(Number(e.target.value))}
          className="w-32 accent-accent"
          aria-label={`Speed: ${SPEED_STOPS[p.speedIdx]}×`}
        />
        <span className="w-12 text-xs tabular-nums text-slate-200">
          ×{SPEED_STOPS[p.speedIdx]}
        </span>
      </LabeledGroup>

      <LabeledGroup label="sound">
        <button
          type="button"
          className={`${btn} ${p.soundOn ? 'border-accent/60 text-accent' : ''}`}
          onClick={p.onToggleSound}
          aria-pressed={p.soundOn}
          aria-label={p.soundOn ? 'Turn sound off' : 'Turn sound on'}
        >
          {p.soundOn ? 'On' : 'Off'}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={p.volume}
          onChange={(e) => p.onVolume(Number(e.target.value))}
          className="w-24 accent-accent"
          aria-label={`Sound volume: ${p.volume}%`}
          disabled={!p.soundOn}
        />
        <div
          className="flex overflow-hidden rounded-lg border border-edge"
          role="group"
          aria-label="Sound mode"
        >
          {SOUND_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => p.onSoundMode(m)}
              aria-pressed={p.soundMode === m}
              title={m === 'both' ? 'Compare + swap' : `Only ${m} sounds`}
              className={`px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 ${
                p.soundMode === m
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-mute hover:text-slate-200'
              }`}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </LabeledGroup>
    </div>
  )
})

function LabeledGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-mute">{label}</span>
      {children}
    </div>
  )
}
