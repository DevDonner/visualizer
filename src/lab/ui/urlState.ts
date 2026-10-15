/**
 * URL state — shareable / reproducible races.
 *
 *   ?algos=bubble,quick&n=128&dist=reversed&speed=8&seed=42
 *
 * Pure (no window access) so it is unit-testable in node. Invalid values are
 * dropped individually (never the whole URL): a bad `seed` does not nuke a
 * valid `algos` list.
 */
import type { Distribution } from '../engine/types.ts'
import { ALGORITHMS } from '../engine/registry.ts'
import { DISTRIBUTIONS } from '../engine/data.ts'
import { SIZE_STOPS, SPEED_STOPS } from './constants.ts'

/** Parsed URL state; a field is null when absent or invalid. */
export interface UrlState {
  /** Validated algorithm ids in registry order, comma-joined; null if none valid. */
  algos: string | null
  n: number | null
  dist: Distribution | null
  speed: number | null
  seed: number | null
}

export function parseUrlState(search: string): UrlState {
  const p = new URLSearchParams(search)

  let algos: string | null = null
  const rawAlgos = p.get('algos')
  if (rawAlgos) {
    const wanted = new Set(rawAlgos.split(',').map((s) => s.trim()).filter(Boolean))
    const valid = ALGORITHMS.filter((a) => wanted.has(a.id)).map((a) => a.id)
    if (valid.length > 0) algos = valid.join(',')
  }

  let n: number | null = null
  const rawN = p.get('n')
  if (rawN !== null) {
    const v = Number(rawN)
    if (Number.isInteger(v) && (SIZE_STOPS as readonly number[]).includes(v)) n = v
  }

  let dist: Distribution | null = null
  const rawDist = p.get('dist')
  if (rawDist !== null && DISTRIBUTIONS.some((d) => d.id === rawDist)) {
    dist = rawDist as Distribution
  }

  let speed: number | null = null
  const rawSpeed = p.get('speed')
  if (rawSpeed !== null) {
    const v = Number(rawSpeed)
    if ((SPEED_STOPS as readonly number[]).includes(v)) speed = v
  }

  let seed: number | null = null
  const rawSeed = p.get('seed')
  if (rawSeed !== null) {
    const v = Number(rawSeed)
    if (Number.isInteger(v) && v >= 1 && v <= 99999) seed = v
  }

  return { algos, n, dist, speed, seed }
}

/** Serialize the current configuration to a query string (no leading `?`). */
export function serializeUrlState(o: {
  selectedKey: string
  sizeIdx: number
  dist: Distribution
  seed: number
  speedIdx: number
}): string {
  const p = new URLSearchParams()
  if (o.selectedKey) p.set('algos', o.selectedKey)
  p.set('n', String(SIZE_STOPS[o.sizeIdx]))
  p.set('dist', o.dist)
  p.set('speed', String(SPEED_STOPS[o.speedIdx]))
  p.set('seed', String(o.seed))
  return p.toString()
}
