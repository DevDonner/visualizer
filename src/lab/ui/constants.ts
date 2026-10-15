import type { Distribution } from '../engine/types.ts'

/** Discrete data-size stops for the slider (elements per lane). */
export const SIZE_STOPS = [16, 32, 64, 128, 256, 512, 1024] as const

/** Global speed stops (step-budget multiplier per lane per frame). */
export const SPEED_STOPS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64] as const

export const DEFAULT_SIZE_IDX = 3 // n = 128
export const DEFAULT_SPEED_IDX = 5 // ×8
export const DEFAULT_DIST: Distribution = 'random'

/** Lanes in the default race — a quadratic, a divide-and-conquer, a linear capstone. */
export const DEFAULT_SELECTED = ['bubble', 'insertion', 'quick', 'timsort']
