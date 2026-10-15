# PROGRESS.md — Sort Visualizer (running log)

> **If a session resumes (restart or compaction):** read `PLAN.md` first, then this
> file bottom-to-top, then continue at the phase marked **ACTIVE**. Phase work
> happens at phase boundaries — finish the current phase's gate before starting the
> next. Update this file at every phase exit and every significant decision.

## How to resume

1. `npm run build` must be green (G1).
2. `node --test` must be green (G2 for whatever exists).
3. Dev server: `npm run dev` → **http://localhost:4180** (IPv6 only — `127.0.0.1:4180`
   fails on this machine). Browser-verification loop: launch Edge via browser tools,
   use `window.__SORTLAB__` debug seam once present (P6+).
4. Continue at **ACTIVE** phase below.

## Status board

| Phase | Status |
|-------|--------|
| P0 scaffold + toolchain | ✅ done |
| P1 engine core | ✅ done |
| P2 12-algorithm library | ✅ done |
| P3 renderer + scheduler | 🔄 ACTIVE |
| P4 UI controls | ⬜ |
| P5 audio | ⬜ |
| P6 leaderboard/URL/a11y | ⬜ |
| P7 review | ⬜ |
| P8 refine | ⬜ |
| P9 final analysis + report | ⬜ |

**ACTIVE: P3**

## Log

### 2026-10-15 — P0 (pre-sleep prep, before long session)
- Recon: found portfolio at `C:\programming\code\portfolio` (Vite 8 + React 19 + TS 7 +
  Tailwind v4 + framer-motion). Read `design.md`, `LABS.md`, `package.json`,
  `src/index.css` (tokens), `src/labs/types.ts` (LabMeta).
- **Decision:** build the visualizer on the *identical stack* (same versions) so the
  lab folder lifts into `portfolio/src/labs/sort-visualizer/` with zero changes.
- **Decision:** engine is pure TS (no React/DOM) → testable with built-in `node --test`
  (zero test deps). Verified: Node 26 runs `.ts` tests natively (type stripping).
- Scaffold written: package.json, tsconfig (strict, erasableSyntaxOnly,
  allowImportingTsExtensions), vite.config, index.html, .gitignore, favicon.svg,
  src/index.css (portfolio tokens verbatim), src/main.tsx, src/lab/{index.tsx,
  meta.ts, types.ts}, src/lab/engine/rng.ts, test/rng.test.ts.
- Internet returned mid-session → `npm install` from registry: 49 packages, OK.
- **G1 green:** `tsc --noEmit && vite build` — 424 modules, built in 4.35s, zero errors.
- **Test infra green:** `node --test` → 3/3 pass. (Note: `node --test test/` does NOT
  work on this Node/Windows — directory arg is treated as a module; bare `node --test`
  auto-discovers. Script fixed.)
- Config: built-in `websearch` + `webfetch` set to `deny` in global opencode config
  (user request; custom SearXNG tools unaffected).
- PLAN.md written with full spec, gates G1–G9, phases P0–P9, stop/continue rule.

### 2026-10-15 (night) — P1 + P2 complete, both committed
- **P1 (`d07595a`):** `engine/{types,runner,data,run}.ts` + `bubble.ts` + tests.
  Runner = pure-TS step machines, one `Action` per `step()`; `runSort()` validates the
  whole stream (indices in range, finite writes, legal ranges, single terminal `done`,
  20M step cap) and derives stats via `countAction`. Bubble fixed a real off-by-one
  (pass-complete now marks `sorted(right)`, bounds next pass by `lastSwap`).
- **P2 (`63e5d72`):** 11 more algorithms + `mergeFrame.ts` (LAZY aux copy — required so
  TimSort can schedule merge frames before their data is final) + `registry.ts`
  (12 `SortAlgorithm` metas: id/name/blurb/complexity/stable/inPlace/create) +
  `test/algorithms.test.ts` matrix: 12 algos × n∈{0,1,2,3,5,17,64,257} × 4 distributions
  + n=1024 convergence with full output verification. **33/33 green.**
- **13 engine bugs found & fixed by the matrix** (all real, none in the test):
  - bubble: (P1) right-bound off-by-one.
  - run.ts: `countAction` never incremented `stats.steps`.
  - shell: "phase-start" flag reset `i`/`j` between elements → infinite loop; rewrote
    the step machine flag-free (pure i/j/gi drive).
  - quick: stage 3 never set `f.stage = 4` → infinite loop on sorted-ish inputs;
    Lomuto scan queued swap actions **without applying them** to the array.
  - merge: sort frames pushed children **without popping themselves** → infinite
    re-expansion (n=2 smallest repro); span-2 frames emitted `compare(-1, 0)`.
  - heap: sift bound used the *decremented* end (heap of 2 never sifted);
    `finished` set before the terminal `done` was emitted → "null before done".
  - timsort: `mergeAt` branch condition inverted (2-run/3-run paths swapped);
    `scheduleMerges` called `mergeAt(-1)` on a 2-run stack; binary-insertion shift
    clobbered `a[insertPos]` before capturing the value.
  - selection: `scanning` flag never reset → 2nd+ scans reused stale `min`/`j`.
  - radix: precomputed per-index 16-bit keys went **stale after pass 0** (LSD reorders
    the array) → keys now derived from the current position each pass.
- **Radix contract decision:** bounded-key radix guarantees *stable sort by 16-bit key*,
  not exact-double order (two distinct values can share a key at 1/65535 resolution).
  Test asserts the key contract for radix (stable order within equal keys); exact
  `deepEqual` for the other 11. Blurb/docs state "16-bit, 2-pass".
- G1 re-verified after all fixes: `tsc --noEmit` + `vite build` green (424 modules).
- `scratch/` (debug scripts) gitignored.
- **Next (P3):** renderer (bars from action stream, per-action animation state) +
  scheduler (speed control, batch steps per frame, rAF loop) — keep `src/lab/`
  self-contained; replace skeleton in `src/lab/index.tsx` during P4.
