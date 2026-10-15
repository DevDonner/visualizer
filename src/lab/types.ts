/**
 * Lab metadata types.
 *
 * Structurally identical to the portfolio's `LabMeta`
 * (portfolio: src/labs/types.ts). Duplicated locally so this lab folder
 * stays fully self-contained — it can be lifted into
 * `portfolio/src/labs/<slug>/` with zero changes (see portfolio LABS.md).
 */
export type LabStatus = 'live' | 'wip'

/** 'solo' builds no badge; 'agentic' shows a violet badge (AI co-programmed). */
export type LabMode = 'solo' | 'agentic'

export interface LabMeta {
  /** Display name, e.g. "Snake". */
  title: string
  /** One line shown on the home card and in the lab header. */
  tagline: string
  /** 'wip' shows an amber badge; 'live' shows the accent badge. */
  status: LabStatus
  /** How the lab was built. */
  mode: LabMode
  /** Optional repo URL for the "Source" link. */
  github?: string
}
