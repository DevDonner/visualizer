import { motion } from 'framer-motion'
import { meta } from './meta.ts'

/**
 * SortLab — the lab's root component.
 *
 * Contract (portfolio LABS.md): default export, takes no props, fills its
 * container, and imports nothing from the site shell — the folder must be
 * liftable into `portfolio/src/labs/<slug>/` with zero changes.
 *
 * P0 placeholder — the real app (control panel + race grid) lands in P4+.
 */
export default function SortLab() {
  return (
    <div className="flex h-full w-full flex-col">
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
      <main className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="rounded-2xl border border-edge bg-surface px-10 py-8 text-center"
        >
          <p className="font-display text-base text-slate-200">Engine coming online</p>
          <p className="mt-2 text-sm text-mute">The sorting race grid arrives with the build.</p>
        </motion.div>
      </main>
    </div>
  )
}
