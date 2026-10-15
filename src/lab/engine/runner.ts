import type { SortRunner } from './types.ts'

/** Runner for degenerate inputs (n < 2): emits a single `done` action. */
export function doneRunner(values: number[]): SortRunner {
  const a = values.slice()
  let emitted = false
  return {
    step: () => {
      if (emitted) return null
      emitted = true
      return { kind: 'done' }
    },
    values: () => a,
    length: a.length,
  }
}
