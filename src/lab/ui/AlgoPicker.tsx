import { memo } from 'react'
import type { SortAlgorithm } from '../engine/types.ts'
import { ALGORITHMS } from '../engine/registry.ts'
import { algoHue } from '../theme.ts'

/**
 * Multi-select algorithm picker — one card per algorithm with identity dot,
 * complexity chips, stable/in-place markers and the blurb. Memoized: the
 * 4 Hz stat tick in the root must not re-render the picker.
 */
export interface AlgoPickerProps {
  selected: ReadonlySet<string>
  onToggle: (id: string) => void
}

export const AlgoPicker = memo(function AlgoPicker({ selected, onToggle }: AlgoPickerProps) {
  return (
    <section aria-label="Algorithm picker">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-mute">
          Algorithms
        </h2>
        <span className="text-xs tabular-nums text-mute">{selected.size} selected</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ALGORITHMS.map((algo) => (
          <AlgoCard
            key={algo.id}
            algo={algo}
            isSelected={selected.has(algo.id)}
            onToggle={() => onToggle(algo.id)}
          />
        ))}
      </div>
    </section>
  )
})

function AlgoCard({
  algo,
  isSelected,
  onToggle,
}: {
  algo: SortAlgorithm
  isSelected: boolean
  onToggle: () => void
}) {
  const hue = algoHue(algo.id)
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        isSelected
          ? 'border-accent/70 bg-accent/5'
          : 'border-edge bg-surface hover:border-mute/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: `hsl(${hue} 55% 55%)` }}
          aria-hidden
        />
        <span className="font-display text-sm font-semibold text-white">{algo.name}</span>
        {isSelected && (
          <span className="ml-auto text-sm text-accent" aria-hidden>
            ✓
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Chip label={algo.complexity.average} />
        <Chip label={algo.complexity.space} />
        {algo.stable && <Chip label="stable" tone="accent" />}
        {algo.inPlace && <Chip label="in-place" tone="accent" />}
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-mute">{algo.blurb}</p>
      <p className="mt-1.5 text-[10px] tabular-nums text-mute/70">
        best {algo.complexity.best} · worst {algo.complexity.worst}
      </p>
    </button>
  )
}

function Chip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'accent' }) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none ${
        tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-ink/60 text-mute'
      }`}
    >
      {label}
    </span>
  )
}
