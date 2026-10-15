# PROGRESS.md — Sort Visualizer (running log)

> **If a session resumes (restart or compaction):** read `PLAN.md` first, then this
> file bottom-to-top, then continue at the phase marked **ACTIVE**. Phase work
> happens at phase boundaries — finish the current phase's gate before starting the
> next. Update this file at every phase exit and every significant decision.

## How to resume

1. `npm run build` must be green (G1).
2. `node --test` must be green (G2 for whatever exists).
3. Dev server: `npm run dev` → http://127.0.0.1:4180 (browser-verification loop:
   launch Edge via browser tools, use `window.__SORTLAB__` debug seam once present).
4. Continue at **ACTIVE** phase below.

## Status board

| Phase | Status |
|-------|--------|
| P0 scaffold + toolchain | ✅ done |
| P1 engine core | ⬜ |
| P2 12-algorithm library | ⬜ |
| P3 renderer + scheduler | ⬜ |
| P4 UI controls | ⬜ |
| P5 audio | ⬜ |
| P6 leaderboard/URL/a11y | ⬜ |
| P7 review | ⬜ |
| P8 refine | ⬜ |
| P9 final analysis + report | ⬜ |

**ACTIVE: P1**

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
