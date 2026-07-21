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

- JSON: `benchmarks/profile-load/<label>-<timestamp>.json`
- Summary: `benchmarks/profile-load/<label>-latest.json` (overwrite per label)
- Console: mean, median, p95, min, max, stddev per metric

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

| Label | Date | Runs | fullyVisible mean | fullyVisible p95 | veilRemoved mean | Notes |
|-------|------|------|-------------------|------------------|------------------|-------|
| `baseline` | 2026-07-21 | 100 | **492.6 ms** | **537.4 ms** | **216.3 ms** | Preview build, 1280×900, cold context, cache off. Raw: `benchmarks/profile-load/baseline-latest.json` |

### Baseline breakdown (mean)

| Milestone | ms | Interpretation |
|-----------|-----|----------------|
| `domContentLoaded` | 92.7 | HTML parsed |
| `typeFitLabelVar` | 122.3 | JS label fit applied |
| `veilRemoved` | 216.3 | Both gates done; fade starts |
| `fullyVisible` | 492.6 | Opacity ≥ 0.99 (includes **~220 ms** shared fade) |

The gap `veilRemoved` → `fullyVisible` (~276 ms) is dominated by the fixed opacity transition, not network or type-fit.

---

## Interpretation notes

- **±10 ms** on `fullyVisible` mean is often noise; look at **p95** and repeat runs.
- The fixed **220 ms opacity fade** is included in `fullyVisible`; optimizations cannot remove it without a separate product decision.
- Warm-cache repeat visits behave differently; this harness targets **cold static assets** (disk cache disabled). Optional warm mode may be added later.
