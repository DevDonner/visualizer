/**
 * Per-algorithm identity hues (degrees) — the muted color each lane's bars
 * and header dot use. Shared by the canvas renderer and the React UI so a
 * lane's color is identical in both.
 */
export const ALGO_HUES: Record<string, number> = {
  bubble: 18,
  cocktail: 205,
  selection: 270,
  insertion: 150,
  shell: 42,
  comb: 330,
  gnome: 190,
  merge: 120,
  quick: 0,
  heap: 215,
  radix: 90,
  timsort: 168,
}

export function algoHue(id: string): number {
  return ALGO_HUES[id] ?? 168
}
