# Jan Havlín — Personal Website

Astro-based personal website focused on clean UX, deterministic behavior, and engineering quality.

This project serves as:

- an owned professional surface for articulating perspective and ideas in long form, independent of generic social-platform profiles,
- the first of my projects where I owned frontend and UX end-to-end,
- a deliberate integration of backend systems discipline with visual and interaction design.

Background:

- Since entering IT, work has centered on internal architecture, domain-centric backend systems, reliability, and performance; CLI tooling is a consistent adjacent practice.
- Visual direction here also reflects formal art training from before IT, applied as a complementary craft rather than a separate track.

Scope and intent:

- Delivering this site strengthened fluency across the full product stack without changing where depth is invested long term.
- Primary specialization remains backend engineering for resilient, thoughtfully designed systems; frontend and UX work here demonstrate adjacent competence, not a pivot in focus.

## Highlights

- **Deterministic testing pipeline**
  - Unit tests (`Vitest`) for core math/logic helpers.
  - End-to-end tests (`Playwright`) split into parallel-safe and serial-sensitive groups.
  - Visual regression snapshots with explicit update flow.
- **Quality gates**
  - `ESLint` + `Prettier` + `astro check`.
  - `astro check` is enforced in script flow with strict handling.
  - Accessibility checks (`axe`) plus keyboard-flow assertions in test suite.
- **Performance guardrails**
  - Dedicated Lighthouse budget script for homepage.
  - Enforced thresholds for score/LCP/CLS/TBT with CI integration.
- **CI/runtime hardening**
  - Port/process hygiene for flaky test prevention.
  - Defensive cleanup and stable `preview`-mode test orchestration.
  - Workflow tuned for reproducible runs.
- **Content and UX maintainability**
  - Blog collection supports optional `featured` metadata.
  - Writing page ordering is deterministic (`date DESC` + `title ASC` tie-break).
  - Featured and regular article groups are separated in UI.
- **Design + JS-backed UX**
  - The visual direction is intentionally balanced and minimalist, while avoiding a static or mundane feel.
  - Visual identity and interaction details are treated as first-class concerns, not cosmetic afterthoughts.
  - Multiple sections use purpose-built client-side behavior (layout/scroll/reveal timing, stateful interactions, deterministic transitions).
  - UX behavior is intentionally test-backed so interactive polish remains maintainable.

## What You Can Audit In This Repo

- **Test strategy and reliability tooling**
  - `scripts/web/integration-tests.sh`
  - `e2e/`
  - `tests/unit/`
  - `scripts/web/` — site pipeline (`all.sh`, lint, unit, Playwright, Lighthouse, Pages build, sitemap verify)
  - `scripts/contact_worker/` — worker pipeline (`all.sh`, semgrep)
  - `scripts/ci/local.sh` — local CI parity (audit + Semgrep + full gate + Lighthouse + Pages/sitemap; no deploy)
  - `contact_worker/` — Cloudflare contact API
  - `shared/contact-api-errors.mjs` (API error codes for site + worker)
- **Performance and accessibility quality bars**
  - `scripts/web/lighthouse.sh`
  - `e2e/perf-a11y.spec.ts`
- **Content model and ordering logic**
  - `src/content.config.ts`
  - `src/utils/writing-posts.ts`
  - `src/pages/writing.astro`
- **Workflow and deployment checks**
  - `.github/workflows/deploy.yml` — calls the same shared scripts as local CI parity
- **Working notes / initiative plans**
  - `docs/working-notes/` — restore recipes and performance initiative notes (not product docs)

## Development Process (Overview)

- **Local quality gates (layered)**
  - Site-only: `bash scripts/web/all.sh` (or `npm run all:web`) — lint/format, `astro check`, unit, Playwright.
  - Worker-only: `bash scripts/contact_worker/all.sh` (or `npm run all:contact-worker`).
  - Full monorepo: `bash scripts/all.sh` (or `npm run all`) — web + worker.
  - CI parity (no deploy): `bash scripts/ci/local.sh` (or `npm run all:ci`) — Semgrep → `npm audit --audit-level=high` → `all.sh` → Lighthouse → Pages build → sitemap verify.
- **CI and deploy**
  - GitHub Actions (`.github/workflows/deploy.yml`) runs the same shared scripts, then uploads/deploys to Pages.
  - Prefer fixing failures with `all:ci` locally before push; keep default `all.sh` for day-to-day speed when audit/Lighthouse/Pages steps are not needed.
- **Test orchestration strategy**
  - Integration tests are intentionally split between parallel-safe and serial-sensitive subsets.
  - The test runner defaults to stable `preview`-mode orchestration to reduce flakiness.
  - Visual snapshots are maintained through a dedicated update process.
- **Performance and accessibility process**
  - Accessibility is validated in automated browser tests (including keyboard-flow checks).
  - Homepage performance budgets are validated through a dedicated Lighthouse process (stricter locally; CI relaxes LCP/perf slightly for runner variance).
- **Operational stability practices**
  - Cleanup routines and port/process guards are built into scripts to prevent stale-run issues.
  - Reproducibility is favored over ad-hoc speed in CI-critical paths.
  - Dependency audit fails on high/critical; transitive pins live in `package.json` `overrides` when upstream cannot clear them cleanly.

## Scope Of This README

This document is intentionally focused on architecture and quality characteristics of the project.
It is not intended as a step-by-step onboarding or command cookbook.
