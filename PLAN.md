# PLAN.md — Algorithm Sort Visualizer

**Project:** `sort-visualizer` — interactive sorting-algorithm race visualizer.
**Owner:** DevDonner (portfolio lab). **Built:** agentic overnight session (Qwen via llamacpp), self-governed.
**Status:** P0 complete (toolchain verified green). See `PROGRESS.md` for the running log.

---

## 1. Mission & success criteria

A showcase lab for the DevDonner portfolio: select any set of sorting algorithms,
pick the data size and distribution, and watch them **race side-by-side on identical
input** in modern, split panels — with optional synthesized sound. It must look
corporate-level, run smoothly with many panels open, and be liftable into
`portfolio/src/labs/<slug>/` with **zero changes** (portfolio LABS.md contract).

Success = all quality gates (§9) green **and** two consecutive refine cycles with
no new P0/P1 findings (§11).

## 2. Product spec

### Global control panel
- **Algorithm picker:** card grid, multi-select, each card shows name + complexity
  badges (best/avg/worst, space) + stable/in-place markers + short description.
- **Data size:** slider, 16–1024 elements per lane.
- **Distribution:** Random · Nearly sorted · Reversed · Few unique.
- **Speed:** global multiplier (steps/frame budget), plus per-lane pause/reset.
- **Transport:** Play/Pause all, Step (when paused), Reset all.
- **Sound:** master toggle + volume slider; per-action sound mode
  (compare / swap / both).
- **Keyboard:** Space = play/pause all · R = reset · S = sound · ↑/↓ = speed.

### Race grid (the money shot)
- One panel per selected algorithm, responsive `auto-fit minmax` grid.
- Every lane sorts a **copy of the same seeded array** at the same clock → true race.
- Each lane: canvas bar view, header (name + identity color + complexity),
  live stats (comparisons, swaps/writes, steps, elapsed), done-state (check + final
  stats + subtle accent flash).
- **Leaderboard overlay** when all lanes finish: ordered by finish time, with
  final comparison/swap counts. Dismissible.
- URL state (`?algos=…&n=…&dist=…&speed=…&seed=…`) → shareable/reproducible races.

### Sound design (Web Audio, fully synthesized — no assets)
- AudioContext created **on the enable gesture** (autoplay-policy safe).
- Bar value → **pentatonic scale** mapping: the array converges musically.
- Compare = quiet sine blip · swap = slightly louder triangle blip · lane finish =
  small arpeggio. Per-lane pitch offset so simultaneous sounds don't stack.
- Rate-limited (≤ 24 notes/frame), exponential decay, low-pass + master gain.
- Disabling mid-run must never throw or leave dangling nodes.

## 3. Stack & environment

Vite 8 · React 19 · TypeScript 7 (strict, erasable-syntax-only) · Tailwind CSS v4
(CSS-first `@theme`) · framer-motion 13 — **identical versions to the portfolio**
(`C:\programming\code\portfolio`), so the lab drops in with zero version drift.

- Tests: Node built-in `node --test` + `node:assert` — **zero test dependencies**
  (Node 26 runs `.ts` natively via type stripping; imports use explicit `.ts` exts).
- Design tokens mirrored exactly from portfolio `src/index.css`
  (ink `#0a0e14`, surface `#121924`, edge `#223047`, accent `#5eead4`, mute `#93a1b5`;
  Inter Variable + Space Grotesk Variable self-hosted).
- House style per portfolio `design.md`: subtle, clean, smooth. No 3D, no flash.
- Internet is available but used only for npm; **no runtime network dependencies**
  (fonts self-hosted, audio synthesized, no CDNs).
- No GitHub repo created/pushed without explicit user approval — local git only.

## 4. Architecture

```
visualizer/
├── index.html · vite.config.ts · tsconfig.json · package.json
├── src/
│   ├── main.tsx              # standalone shell: mounts <SortLab /> full-screen
│   ├── index.css             # tailwind + @theme tokens (mirrors portfolio)
│   └── lab/                  # ← THE LIFTABLE LAB (self-contained, no external imports)
│       ├── index.tsx         #   SortLab root (default export, no props)
│       ├── meta.ts · types.ts
│       ├── engine/           #   pure TS, no React/DOM — unit-testable in node
│       │   ├── types.ts      #     Action model, SortRunner, SortAlgorithm, Distribution
│       │   ├── rng.ts        #     mulberry32 (done)
│       │   ├── data.ts       #     makeData(n, dist, seed)
│       │   ├── run.ts        #     pure driver: run-to-completion + stats (test seam)
│       │   └── algorithms/   #     12 modules, one per algorithm
│       ├── render/           #   canvas renderer (DPR-aware, per-lane)
│       ├── audio/            #   Web Audio engine (pentatonic, rate-limited)
│       ├── scheduler.ts      #   single rAF loop driving all lanes (steps/frame budget)
│       └── ui/               #   React components (ControlPanel, Lane, Leaderboard…)
└── test/                     #   node:test suites for engine (pure)
```

**Core model — action stream.** Every algorithm is a step-machine:
`SortAlgorithm.create(n)` → `SortRunner`; `runner.step()` returns exactly one
`Action` per call until it returns `null`:

```ts
type Action =
  | { kind: 'compare'; i: number; j: number }
  | { kind: 'swap'; i: number; j: number }
  | { kind: 'write'; i: number; value: number }  // aux-array copy (merge/radix/…)
  | { kind: 'pivot'; i: number }
  | { kind: 'range'; lo: number; hi: number }    // active sub-range (visual dimming)
  | { kind: 'sorted'; i: number }
  | { kind: 'done'; comparisons: number; swaps: number; writes: number; steps: number }
```

One model feeds renderer, audio, and stats identically → deterministic, testable.
The React layer only re-renders ~4×/s for stat text; the scheduler mutates canvas
directly via rAF (perf-safe under StrictMode, clean teardown on unmount).

## 5. Algorithm lineup (12)

bubble · cocktail-shaker · selection · insertion · shell · comb · gnome ·
merge (top-down) · quick (Lomuto, median-of-three) · heap (Floyd) ·
radix (LSD, base 256) · **timsort** (capstone; if too gnarly, swap in
binary-insertion and note in report).

Each: metadata (complexities, stable?, in-place?, one-paragraph description) +
correct implementation. **Every algorithm is covered by the test matrix (§9).**

## 6. Design language

Dark only (portfolio is dark). Glassy-but-restrained panels: `bg-surface` on
`bg-ink`, `border-edge`, 12–16px radii, accent teal for active/interactive,
per-algorithm identity hue for lane headers (muted, low saturation).
Micro-interactions: hover lift on algorithm cards, smooth bar-color transitions,
subtle done-flash. `prefers-reduced-motion` respected. Focus-visible rings on
every control. ARIA labels + `aria-live` status.

## 7. Performance budget

- ≥ 55 fps with **6 lanes × 512 bars** (rAF sample via debug hook, gate in §9).
- One rAF loop for all lanes; per-lane step budget derived from speed.
- DPR-aware canvases; resize-observer redraw; only dirty lanes redrawn.
- Bars via batched `fillRect` (grouped by color state); no per-frame allocations
  in hot path; no `shadowBlur` in hot path (pre-rendered glow sprite or gradient).
- Audio rate-limited; no node churn beyond rate limit.

## 8. Debug seam

`window.__SORTLAB__` (dev + prod, harmless): `{ getState(), forceStepAll(),
  snapshot() }` — used by the browser-verification loop to assert "all lanes
  finished and bars are sorted" without guessing from pixels.

## 9. Quality gates (definition of done)

| # | Gate | Check |
|---|------|-------|
| G1 | Toolchain | `npm run build` (tsc strict + vite) clean |
| G2 | Correctness | `node --test` green: all 12 algos × n∈{1,2,3,17,64,257} × 4 distributions → completes, output sorted, permutation of input; all action indices in range; `done` emitted exactly once |
| G3 | Runtime | Browser (real Edge via browser tools): loads with **zero console errors**; 12-lane race @ n=256 completes; `__SORTLAB__.snapshot()` proves every lane sorted |
| G4 | Performance | ≥ 55 fps, 6 lanes × 512 bars (in-page rAF sampling) |
| G5 | Responsive | Screenshots @ 1440 / 768 / 375 all correct |
| G6 | A11y | Keyboard shortcuts work; ARIA present; reduced-motion honored |
| G7 | Audio | Toggle on/off (incl. mid-run); volume; no autoplay violation; no throws |
| G8 | Portability | `lab/` imports nothing outside itself (grep gate); meta.ts portable; README has screenshots (PNGs from browser captures) + lift instructions |
| G9 | Hygiene | No dead code, consistent style, JSDoc on public API, no TODOs left behind |

## 10. Phases

| Phase | Content | Exit gate |
|-------|---------|-----------|
| P0 | Scaffold, tokens, skeleton, toolchain | G1 + `node --test` infra (✅ done) |
| P1 | Engine: data model, action model, driver, RNG-seeded data | G2 on 1 real algorithm (bubble) |
| P2 | Full 12-algorithm library | G2 full matrix |
| P3 | Renderer + scheduler (multi-lane canvas grid) | builds; lanes render & animate in browser |
| P4 | UI: control panel, algorithm picker, sliders, per-lane controls, stats | G3 partial (loads clean, controls work) |
| P5 | Audio engine + sound controls | G7 |
| P6 | Leaderboard, URL state, done-states, a11y pass | G6 |
| P7 | Review: browser screenshots (3 breakpoints), perf sampling, code review, all gates | findings list (REVIEW.md) |
| P8 | Refine cycles | findings closed |
| P9 | Analysis: gate scorecard → stop/continue decision, README, final report | §11 rule |

Commits per phase. `PROGRESS.md` updated at each phase exit (compaction-safe).

## 11. Stop/continue rule (self-governance)

After each refine cycle (P8+): re-run **all** gates + a fresh findings scan
(new screenshots, code-smell grep, additional edge tests).
- **Stop** when: all gates green **and** 2 consecutive cycles produced zero new
  P0/P1 findings. → write final report (gate scorecard, what was built, how to
  run/lift it, anything deliberately left out).
- **Continue** otherwise (fix findings, repeat).
- **Time-box:** ~6 h budget. At ~5 h, cut scope in priority order
  (timsort → radix → extra distributions → leaderboard) to hit gates on a
  reduced-but-complete set; note the cut in the report.

## 12. Risk register

| Risk | Mitigation |
|------|-----------|
| TimSort correctness (runs/galloping) | Simplified correct TimSort (no galloping); full test matrix; fallback = binary insertion |
| FPS with 12 lanes | Step budget + dirty-lane redraw; G4 gate; degrade speed slider range if needed |
| Audio buzz at high step rates | Rate limit + pentatonic (harmonics) + per-lane offset; G7 |
| StrictMode double-effect leaks | Explicit rAF/AudioContext teardown in effect cleanup |
| Context loss (compaction overnight) | PLAN + PROGRESS are the recovery docs; re-read on resume, continue at phase boundary |
| Browser tool quirks (known: key tool quirks per portfolio notes) | Verify via `browser_eval` state reads (`__SORTLAB__`) rather than pixels alone |

## 13. Assumptions (overridable by user in the morning)

1. Lab `mode: 'agentic'` (portfolio's violet-badge convention for AI co-programmed).
2. Dark theme only (portfolio is dark; consistency wins).
3. No remote repo — local git only until user says otherwise.
4. 12 algorithms (11 classic + TimSort capstone); final lineup may swap per P2.
5. Standalone dev server on port **4180** (avoids portfolio's 4173/5173).
