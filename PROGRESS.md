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
| P3 renderer + scheduler | ✅ done |
| P4 UI controls | ✅ done |
| P5 audio | ✅ done |
| P6 leaderboard/URL/a11y | ✅ done |
| P7 review | ✅ done |
| P8 refine | ✅ done |
| P9 final analysis + report | ✅ done |

**Status: complete — all phases done, stop rule met.**

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

### 2026-10-15 (night) — P3 complete (`e778818`)
- `theme.ts` (per-algo hue, portfolio tokens), `render/renderer.ts` (`LaneRenderer`:
  single-pass batched bar draw, DPR-aware `resize()`, lazy `fillStyle` switching),
  `scheduler.ts` (`RaceScheduler`: one rAF loop, per-lane step budget
  `BASE_BUDGET × speed`, self-stops when every lane is done).
- Browser-verified: 4 lanes render/animate in lockstep (~240 fps), zero console
  errors, textbook stats (selection n=128 = 8128 comps), clean rest-state pixels,
  finish markers + done tone.

### 2026-10-15 (night) — P4 complete + engine stat fix
- **engine fix (`b43552f`):** the compare-driven sorts (bubble/cocktail/gnome/
  insertion/shell) only emitted a `compare` on the no-swap branch, so every
  comparison that resolved to a swap was uncounted (reversed bubble showed c=0).
  Now the compare is emitted at decision, the swap is queued, and the array mutation
  is applied when the swap is dequeued (mutate-at-emit contract preserved). Stats now
  match textbook: reversed n=128 → c=sw=n(n−1)/2 (bubble/cocktail/insertion),
  gnome c=2·n(n−1)/2. Verified end-to-end in-browser (final stats identical to the
  node dump: 7880/3770, 3894/3770, 899/374, 751/1461).
- **P4 (`79562b1`):** `ui/` (AlgoPicker, ControlPanel, RaceGrid, LanePanel,
  constants), root `index.tsx` (race config + 4 Hz transport tick; lanes self-poll
  stats at 4 Hz), scheduler per-lane `togglePauseLane`/`resetLane` + `finishMs`/
  `startedAt`, and `test/scheduler.test.ts`. 39/39 green.
- Per-lane pause verified two ways: (a) deterministic node tests (6/6 — paused lane
  frozen while others advance and cannot finish; all-paused halts the loop, unpause
  revives it; `resetLane` rebuilds one lane; distinct finishOrder 1..n); (b) live
  browser at n=1024 × 0.25 — bubble frozen byte-identical across samples while
  insertion kept advancing.
- **Root cause of the earlier "inconclusive" browser pause attempts:** a test-harness
  clock mismatch, NOT an app bug. At the default ×8 speed the whole race finishes in
  ~257 ms (faster than a CDP round-trip), and the 4 Hz DOM re-render lags the rAF
  clock, so a stale baseline read looked like "the pause didn't hold". Slowing the
  race (n=1024 × 0.25) and comparing a lane against itself across samples resolves it.

### 2026-10-15 (night) — P5 complete (`6f517e1`)
- `audio/engine.ts` — `SoundEngine`, fully synthesized Web Audio (no assets, no
  network). AudioContext created/resumed **only inside the enable gesture**
  (autoplay-policy safe), suspended on disable; every scheduled source
  self-disconnects on `ended`, so disabling mid-run or `dispose()` never throws
  or leaks nodes. Bar value → C-major pentatonic (3 octaves over A3) with a
  per-lane offset (bounded to one octave, 12 distinct pitches) so simultaneous
  lanes never pitch-stack. Compare = quiet sine blip, swap = louder triangle
  blip, finish = ascending C-E-G arpeggio; exponential-decay envelopes into a
  shared low-pass + master gain, capped at 24 notes/frame (fast races become
  texture, not a wall of clicks).
- `scheduler.ts` gained a decoupled `ActionSink` (`beginFrame`/`onAction`), fed
  from the `tick` and `stepOnce` loops. Structural typing keeps the scheduler
  audio-free and node-testable (tests construct it with no sink).
- Control panel: SOUND on/off toggle (gesture-driven), volume slider, and a
  compare/swap/both segmented mode control.
- `test/audio.test.ts`: pure pentatonic mapping (bounds, monotonicity, scale
  membership, 12 distinct lane pitches, [0,1] clamping). 43/43 green.
- Browser-verified (G7): enable in gesture → disable **mid-run** → re-enable →
  volume + mode changes → full race to completion. Zero console errors, no
  autoplay-policy warnings, final stats identical to the engine.

### 2026-10-15 (night) — P6 complete (`86efc60`)
- `ui/urlState.ts` — pure `?algos&n&dist&speed&seed` parser/serializer: invalid
  fields drop individually (a bad `seed` never nukes a valid `algos` list), algo
  ids validated against the registry and normalized to registry order. Node-tested
  (5 cases, incl. round-trip).
- Root `index.tsx` — URL read on init + `replaceState` write on every config
  change (shareable/reproducible races); keyboard shortcuts Space/R/S/↑↓ that
  step aside for focused form fields (sliders own the arrows) and leave native
  Space activation on focused buttons alone; `role=status` aria-live region
  (ready → running with per-lane finish counts → complete); `window.__SORTLAB__`
  debug seam — `getState()`, `forceStepAll()`, and `snapshot()` (per-lane
  done + is-the-array-sorted + stats), so browser verification no longer guesses
  from pixels.
- `ui/Leaderboard.tsx` — podium overlay when every lane finishes: rows ordered
  by finish time, ★ on the winner, final compares/swaps/writes, dismissible via
  button or backdrop; framer-motion entrance skipped under
  `prefers-reduced-motion`.
- **Bug found in browser verification + fixed:** the podium re-arm originally
  sampled `allDone` at 4 Hz, but a fast race (×64, n=16) finishes in <100 ms —
  between samples — so after dismiss → reset → replay the podium could stay
  stuck off. Re-arm is now deterministic: scheduler (re)creation and explicit
  reset both reset the dismissal flag. Verified: re-arms on reset+replay *and*
  on setting change.
- `LanePanel` — one-shot accent flash on lane finish (framer-motion, gated by
  `useReducedMotion`); `ControlPanel` — shortcut-hint line on wide screens;
  `scheduler.laneValues(li)` accessor for the seam.
- Browser-verified (G6): deep-link parse, URL write, all four shortcuts, podium
  show/dismiss/re-arm both paths, `snapshot()` all done+sorted, zero console
  errors on fresh load. 48/48 tests.

### 2026-10-15 (night) — P7 complete (`bc4669c`)
- Full gate pass, results + findings in `REVIEW.md`.
- G3 (full): 12-lane race @ n=256 completes; fresh load zero console errors;
  `__SORTLAB__.snapshot()` proves every lane sorted per contract.
- G4: 6 lanes × 512 bars @ ×1 — in-page rAF sampling sustained the display
  ceiling (~240 fps / ~4.3 ms frames on the 240 Hz test display; gate ≥ 55).
- G5: 1440 / 768 / 375 captures.
- Findings fixed: F1 (P1) leaderboard table clipped at 375 px →
  `overflow-x-auto` table wrapper + dialog `max-h-[85vh]`; F2 (P2) raw float
  ms in chips/podium → `fmtMs()` (0.1 ms precision); F3 (P2) seam's strict
  order check misreported radix → exported `radixKey`, seam now reports
  `sorted` / `sortedByKey` / per-lane `contract`; 12-lane re-run allContract.
- G8 grep gate: all 88 in-lab imports stay inside `src/lab` or are
  react/framer-motion. G9: no TODOs, strict tsc clean, JSDoc on public API.

### 2026-10-15 (night) — P8 complete (`2d78739`)
- Two refine cycles, zero new P0/P1 → stop rule met.
- Cycle 1 (edge cases): single-lane race; garbage URL per-field fallback
  (`?algos=&n=bogus&zzz=1&speed=64` → defaults except valid speed kept);
  12-lane podium at 375×812 fits; volume-0 audio clean.
- Cycle 2 (load + review): 12 lanes × 1024 bars @ ×4 held the display
  ceiling (~240 fps / ~4.3 ms worst frame) mid-race.
- F5 (P2) found + fixed: leaderboard `role=dialog` now focuses the Close
  button on open and closes on Escape (non-modal by design); stable
  `dismissLeaderboard` callback. Verified in dev and in the production
  build (`vite preview`); dev-only HMR flakiness recorded as N4.

### 2026-10-15 (night) — P9 complete
- `meta.ts` flipped to `status: 'live'`.
- `README.md`: overview, the twelve, run instructions, architecture,
  verification pointer, and lift-into-portfolio instructions (zero-change
  copy of `src/lab/` per `portfolio/LABS.md`).
- `screenshots/`: hero-1440, leaderboard-1440, mobile-375 (browser captures).
- Final decision: **stop** — all gates green, stop rule met (two consecutive
  zero-new-P0/P1 refine cycles), 48/48 tests, build clean.
