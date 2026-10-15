# REVIEW — P7 (2026-10-15)

Independent pass over the finished build: gate verification, breakpoint audit,
performance sampling, and code/hygiene review. Findings below with severity and
disposition; every P1 was closed and re-verified before entering P8.

## Gate results

| Gate | Result | Evidence |
|------|--------|----------|
| G1 toolchain | ✅ | `npm run build` (tsc strict + vite) clean — 382 kB raw / 121 kB gzip |
| G2 correctness | ✅ | 48/48 `node --test`: 12 algos × n∈{1,2,3,17,64,257} × 4 distributions (sorted output, permutation of input, in-range action indices, exactly one `done`); compare-fix pattern; radix key contract; audio + urlState pure tests |
| G3 runtime | ✅ | 12-lane race @ n=256 completes in real Edge; fresh load with zero console errors; `__SORTLAB__.snapshot()` → all 12 lanes `contract: true` (11 strict-sorted, radix by 16-bit key order) |
| G4 performance | ✅ | 6 lanes × 512 bars @ ×1, in-page rAF sampling: 189 frames @ ~4.3 ms (240 fps on the 240 Hz test display; worst frame 4.4 ms). Gate is ≥ 55 fps — passed at the display ceiling |
| G5 responsive | ✅ | Captures at 1440 / 768 / 375. 375 podium clipping found + fixed (F1); re-verified: dialog inside viewport, table h-scrolls, no page overflow |
| G6 a11y | ✅ | Space / R / S / ↑↓ verified in browser (steps aside for focused form fields, keeps native Space on focused buttons); `role=status` aria-live region announces ready → running (per-lane finish count) → complete; reduced-motion gates podium entrance + lane done-flash in code (N1) |
| G7 audio | ✅ | (P5) AudioContext created/resumed only in the enable gesture; disable mid-run, volume + mode changes, full race to completion — zero warnings, no throws, final stats identical to the silent engine |
| G8 portability | ✅ | Grep gate: all 88 in-lab imports are relative-within-`src/lab` or `react` / `framer-motion` — nothing from the site shell; `meta.ts` self-contained. README screenshots + lift instructions land in P9 |
| G9 hygiene | ✅ | No TODO/FIXME/HACK; strict tsc with `noUnusedLocals/Parameters` clean; JSDoc on the public API across engine / render / audio / ui |

## Findings

### F1 — P1 — Leaderboard table clipped at 375 px — **fixed**
The six-column podium is wider than a phone viewport; SWAPS/WRITES were cut
off with no way to reach them. Fix: table wrapped in `overflow-x-auto`
(`min-w-[420px]` keeps the columns from collapsing) and the dialog given
`max-h-[85vh] overflow-y-auto` for the 12-lane case. Verified at 375×812
(dpr 2, mobile): dialog spans 26–349 px (inside the viewport), table
`scrollWidth 420 > clientWidth 285` (h-scrollable), body `scrollWidth` equals
the viewport (no page-level overflow).

### F2 — P2 — Raw float milliseconds in the UI — **fixed**
`performance.now()` deltas were rendered verbatim: `256.19999999925494 ms`
in the lane done-chips and the podium. Fix: `fmtMs()` (rounds to 0.1 ms) in
`LanePanel` + `Leaderboard` → `256.2 ms`. The debug seam deliberately keeps
raw values — it is a verification surface, not a display.

### F3 — P2 — Debug seam misreported radix as unsorted — **fixed**
`snapshot()` checked strict double order, but radix's documented contract is
stable **16-bit key** order (distinct doubles within 1/65535 share a key), so
the seam flagged a *correct* radix sort as `sorted: false`. Fix: exported
`radixKey` from `radix.ts` (single source of truth) and the seam now reports
`sorted`, `sortedByKey`, and a per-lane `contract` (radix → key order, all
others → strict order). Re-ran the 12-lane race: `allContract: true`.

### F4 — P1 — Podium re-arm race condition — **fixed (during P6)**
Dismiss → reset → replay, with a race that finishes in <100 ms (×64, n=16),
could leave the podium stuck dismissed: the re-arm sampled `allDone` at 4 Hz
and a fast race completes between samples, so the "not all done" state was
never observed. Fix: deterministic re-arm — scheduler (re)creation and
explicit reset both clear the dismissal flag. Verified both paths in the
browser (reset+replay and setting-change).

### F5 — P2 — Leaderboard dialog had no focus handling — **fixed (P8)**
The `role="dialog"` podium took no focus on open and had no Escape-to-close;
keyboard and screen-reader users had to hunt for the Close button. Fix:
`Leaderboard` focuses the Close button on mount and registers a window
`keydown` for `Escape` (via a ref, so 4 Hz parent re-renders can't churn the
listener); `index.tsx` passes a stable `dismissLeaderboard` callback. The
dialog is intentionally **non-modal** — background shortcuts (R to re-run)
keep working, which matches its use as a "result banner", not a modal.
Verified in dev **and** in the production build (`vite preview`): focus on
the Close button on open, persists across 4 Hz ticks, Escape closes, zero
console errors.

## P8 refine cycles

**Cycle 1 — edge-case exploration (zero new P0/P1):**
- Single-lane race (1 algo): 1 lane, 1-row podium, clean console.
- Garbage URL `?algos=&n=bogus&zzz=1&speed=64`: per-field fallback exactly as
  designed — invalid fields drop to defaults (4 lanes / n=128 / Random /
  seed 42), the valid `speed=64` is kept; URL canonicalized on load.
- 12-lane podium at 375×812: all 12 rows render (499 px content < 85 vh
  max-height), dialog inside viewport, no page overflow.
- Sound enabled at volume 0, full 12-lane race: zero console errors, no
  throws (notes scheduled at zero gain).

**Cycle 2 — load + code review (zero new P0/P1; one P2 found and fixed):**
- Stress: 12 lanes × 1024 bars @ ×4 (4× G4's bar count, 2× its lane count) —
  in-page rAF sampling sustained the display ceiling: 189 frames @ ~4.3 ms
  (240 fps on the 240 Hz test display, worst frame 4.3 ms) with the race
  genuinely mid-run (`running: true`, 9,342 comparisons on the bubble lane).
- Code review found F5 (dialog focus/Escape), fixed and verified.

**Stop rule:** two consecutive refine cycles with zero new P0/P1 — met.

## Notes (no action needed)

- **N1** — `prefers-reduced-motion` is honored in code (framer-motion
  `useReducedMotion` gates the podium entrance and the lane done-flash); no
  OS-level media emulation is available in this environment, so this was
  verified by code path rather than device emulation.
- **N2** — `framer-motion` adds ~130 kB raw to the bundle (252 → 382 kB).
  It is on the portfolio stack and the plan has no bundle-size gate.
- **N3** — The `browserKey` harness sends `e.key === 'space'` (not `' '`) for
  Space, so Space was verified with a spec-compliant dispatched `keydown`.
  Not an app issue: real keypresses carry `' '`, which the handler matches.
- **N4** — During P8, the podium's focus/Escape effect intermittently failed
  to run *in the dev server* (HMR/Fast-Refresh can swap the module while a
  race is in flight, leaving a hybrid mount state). Reproduced no consistent
  pattern; a clean load and the production build (`vite preview`) behave
  correctly every time. Dev-server-only artifact — no production impact.

## Verdict

All nine gates green. Five findings across the whole build (two P1, three
P2) — all closed and re-verified in-browser, including against the
production build. P8 refine cycles complete under the stop rule (two
consecutive cycles with zero new P0/P1). Ready for P9 final packaging.
