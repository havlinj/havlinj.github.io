# Profile load performance initiative

Goal: shorten time until the Profile grid is fully visible **without changing final layout or visual style**. Every optimization is measured; subjective “feels faster” is not enough.

---

## Non‑negotiable constraints

1. **Final layout and appearance must match the current baseline** (Playwright layout snapshot, seam/gutter e2e, visual snapshot `profile-section.png`).
2. No change that can show tile outlines, label size jumps, or grid movement after reveal.
3. If a change saves time but fails stability tests, it is **rejected** regardless of benchmark gain.

---

## Selected candidate changes (layout‑safe first)

Only variants with **low risk to final pixels** enter the pipeline. Order is by expected gain vs risk.

| ID | Change | Expected gain | Layout risk | Effort |
|----|--------|---------------|-------------|--------|
| **A** | Defer Why/Foundations **tile BG preloads** (keep portrait + profile.css + Inter 700) | Low–medium on slow networks | **Very low** — BG only visible inside buttons after reveal | Low |
| **B** | Font gate: wait for **Inter 700 only** (not 400) before type-fit | Low–medium | **Very low** — labels use 700; 400 is for reveal copy | Low |
| **C** | Signal type-fit **immediately after label fit + gutter sync**; defer GIF video wiring until after signal | Low–medium | **Low** — video is under veil / decorative tile | Low |
| **D** | Reduce stable fit passes **3 → 2** (keep max 24 frames cap) | Medium | **Low** — e2e layout stability must pass | Low |
| **E** | Load type-fit module **earlier** (head `modulepreload` + script order; already partially done) | Low | **Very low** | Low |
| **F** | **`profile.css` as `<link rel="stylesheet">` in head** (replace JS inject) — removes CSS poll wait | Medium–high | **Medium** — cascade order vs `page-buttons.css`; requires careful QA | Medium |

**Not in scope for this initiative** (high layout/visual risk):

- Reveal before type-fit completes
- CSS-only type-fit replacing JS measurement
- Build-time injected `--profile-tile-label-font-size`
- Shorter fade than shared `0.22s ease-out`
- Single stable fit pass (0) without measuring D→2 first

Each ID is implemented **alone**, then re-benchmarked. No stacking until single-change results are recorded.

---

## Metrics

All times in milliseconds, measured from navigation start to milestone.

| Metric | Definition |
|--------|------------|
| `domContentLoaded` | `performance.timing.domContentLoadedEventEnd - navigationStart` (or Navigation Timing v2 equivalent) |
| `typeFitLabelVar` | `--profile-tile-label-font-size` set on `.profile-section` (non-empty, starts with digit) |
| `veilRemoved` | `.profile-section--loading` class removed |
| `fullyVisible` | No loading class **and** computed `opacity ≥ 0.99` on `.profile-section` |

**Primary KPI:** `fullyVisible` (what the user experiences as “loaded”).

Secondary: `veilRemoved` (logic ready), `typeFitLabelVar` (JS fit done).

---

## Benchmark harness

Script: `scripts/benchmark/profile-load-measure.mjs`  
Breakdown (veil timeline): `scripts/benchmark/profile-load-breakdown.mjs`  
Compare saved runs: `scripts/benchmark/profile-load-compare-results.mjs`

```bash
# 1. Build once (stable preview, matches CI)
npm run build

# 2. Baseline (100 runs, cold cache per run)
npm run benchmark:profile-load:measure -- --label=baseline

# 3. After a single change (same command, new label)
npm run benchmark:profile-load:measure -- --label=after-A-defer-bg-preload
```

### Environment defaults

- **URL:** `http://127.0.0.1:4321/profile`
- **Viewport:** 1280×900 (desktop profile e2e reference)
- **Runs:** 100 (override with `--runs=N`)
- **Browser:** Chromium, **`--disable-http-cache`**
- **Context:** new browser context **per run** (no cookies/storage carry-over)
- **Server:** starts `astro preview` automatically unless `--no-server` and port already up

### Output

- JSON: `benchmarks/profile-load/<label>-<timestamp>.json` (**local only** — gitignored)
- Summary: `benchmarks/profile-load/<label>-latest.json` (overwrite per label; gitignored)
- Console: mean, median, p95, min, max, stddev per metric
- **Permanent record:** update the **Results log** in this doc (numbers + decision). Do not commit JSON files.

The `benchmarks/profile-load/` directory is a **local cache** created by the measure script. It is not part of the repo (JSON is gitignored). Safe to delete; it is recreated on the next run. Keep only what you need for active comparisons (typically `baseline-latest.json` plus the current experiment).

### Apply / reject criteria

| Outcome | Criteria |
|---------|----------|
| **Apply (performance)** | Profile e2e + layout snapshots pass **and** `fullyVisible` mean improves by **≥ 10 ms** vs baseline **and** p95 does not regress |
| **Apply (architecture)** | Tests pass, KPI neutral or slightly better on secondary metrics (e.g. `veilRemoved`), and the change fixes a clear loading-order bug |
| **Defer** | Meaningful gain but residual layout risk or needs explicit product approval (e.g. variant **D**) |
| **Reject** | Tests fail, KPI regresses, or gain is within noise (±10 ms) with no architectural benefit |

Re-baseline when Node, Playwright, or major profile boot code changes.

### Comparing two runs

```bash
node scripts/benchmark/profile-load-compare-results.mjs \
  benchmarks/profile-load/baseline-latest.json \
  benchmarks/profile-load/after-A-defer-bg-preload-latest.json
```

Reports delta (ms and %) per metric with label names.

---

## Workflow per change

1. Record **baseline** (or latest reference) — 100 runs.
2. Implement **one** candidate ID.
3. Run **unit + profile e2e** (`profile-loading`, `profile-route`, `page-reveal`, layout snapshot if touched).
4. Run **benchmark** with new `--label`.
5. Run **compare** script vs baseline.
6. If tests pass **and** KPI improves (or neutral with other gains), merge; else revert.
7. Update the **Results log** section below.

---

## Results log

Reference baseline: **492.6 ms** `fullyVisible` mean (100 runs, preview, 1280×900, cold context, cache off, 2026-07-21).

| Label | Change | Δ fullyVisible | Δ veilRemoved | Tests | Decision |
|-------|--------|----------------|---------------|-------|----------|
| `baseline` | — (reference) | — | — | — | Reference KPI |
| **A** | Remove Why/Foundations tile BG preloads from head | **+6.2 ms** | +4.1 ms | Pass | **Rejected** — slower |
| **B** | Font gate: Inter 700 only (skip 400 wait) | **+4.6 ms** | — | Pass | **Rejected** — slower |
| **C** | Defer `wireProfileGifTileMedia` until after type-fit signal | **+0.2 ms** | — | Pass | **Rejected** — neutral |
| **D** | Stable fit passes 3 → 2 | **−11.5 ms** (isolated) | — | Pass | **Applied** — part of veil-path-shorten bundle |
| **E** | Earlier type-fit boot (head `modulepreload` / script order) | **+2.9 ms** | — | Pass (one variant broke head slot) | **Rejected** |
| **F** | `profile.css` as `<link rel="stylesheet">` in head | — | — | **Fail** (snapshot / gutters) | **Rejected** |
| **F v2** | Insert `profile.css` link after Layout bundle | — | — | **Fail** | **Rejected** |
| **WebP** | Portrait as WebP instead of PNG | — | — | N/A | **Not viable** — full-res WebP ~4 MB vs PNG ~318 KB |
| **12** | Hover prefetch `/profile` (`profile-route-prefetch.ts`) | **+3.3 ms** (direct) / −4.5 ms (via-home, different harness) | — | Pass | **Rejected** — file removed; warm-cache mode not comparable to cold baseline |
| **HR-9** | Parallel font load + type-fit | **+19.7 ms** | — | Pass | **Reverted** — regressed |
| **defer-what-i-do-video** | MP4 wiring after veil (4 rAF); preload fallback poster; video `preload="none"` | **−0.5 ms** | **−2.9 ms** | Pass | **Kept** — architectural |
| **veil-path-shorten** | D (stable passes 2) + reveal 1 rAF (was 2) + defer-video | **−32.2 ms** | **−36.9 ms** | Pass | **Kept** — see veilRemoved breakdown |

### Baseline breakdown (mean)

| Milestone | ms | Interpretation |
|-----------|-----|----------------|
| `domContentLoaded` | 92.7 | HTML parsed |
| `typeFitLabelVar` | 122.3 | JS label fit applied |
| `veilRemoved` | 216.3 | Both gates done; fade starts |
| `fullyVisible` | 492.6 | Opacity ≥ 0.99 (includes **~220 ms** shared fade) |

The gap `veilRemoved` → `fullyVisible` (~276 ms baseline) is dominated by the fixed opacity transition, not network or type-fit. After veil-path optimizations (2026-07-21) the gap is ~281 ms — `fullyVisible` dropped with `veilRemoved`, fade duration unchanged.

### Notes on decisions

- **veil-path-shorten** targets the type-fit stable loop and post-gate rAF overhead, not portrait or MP4 (see breakdown below).
- **defer-what-i-do-video** was kept despite neutral KPI in isolation: reveal never gated on video, but MP4 previously downloaded under the veil.
- Rejected variants were reverted; active uncommitted work: defer-video + veil-path-shorten + docs/gitignore/breakdown script.

---

## veilRemoved breakdown (~216 ms baseline)

Diagnostic: `npm run benchmark:profile-load:breakdown` (50 runs, local preview).

On cold desktop preview (1280×900), **portrait is not the bottleneck** — preload + `decoding="sync"` delivers pixels by ~40 ms. The veil waits on **type-fit finishing** and then **extra rAF delay** before removing `--loading`.

| Milestone | ~ms (baseline) | Role |
|-----------|----------------|------|
| `profileCssApplied` | 44 | `profile.css` injected at body start |
| `fontsReady` | 58 | Inter 400 + 700 `fonts.load` |
| `domContentLoaded` | 70 | HTML + inline hide rules parsed |
| `typeFitLabelVar` | 98 | First `fitAll` — label size applied |
| **`typeFitEvent`** | **155** | **3 stable rAF passes done — slow gate** |
| `portraitComplete` | 38 | Already ready long before veil drops |
| **`veilRemoved`** | **192–216** | typeFit + **2 rAF** (~37 ms overhead) |

**Applied shortenings (2026-07-21):**

1. Stable fit passes **3 → 2** (variant D).
2. Reveal **2 rAF → 1 rAF** after both gates (saved ~20 ms; e2e stable).

Combined with defer-what-i-do-video (architectural), 100-run result vs baseline:

| Metric | Baseline | After | Δ |
|--------|----------|-------|---|
| `veilRemoved` | 216.3 ms | **179.4 ms** | **−36.9 ms** |
| `fullyVisible` | 492.6 ms | **460.4 ms** | **−32.2 ms** |

Further gains on `veilRemoved` need earlier type-fit boot or fewer measurement frames — diminishing returns. `fullyVisible` still includes the fixed **220 ms fade**.

---

## Interpretation notes

- **±10 ms** on `fullyVisible` mean is often noise; look at **p95** and repeat runs.
- The fixed **220 ms opacity fade** is included in `fullyVisible`; optimizations cannot remove it without a separate product decision.
- Warm-cache repeat visits behave differently; this harness targets **cold static assets** (disk cache disabled). Optional warm mode may be added later.
