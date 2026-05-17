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
  - `scripts/integration-tests.sh`
  - `e2e/`
  - `tests/unit/`
- **Performance and accessibility quality bars**
  - `scripts/lighthouse.sh`
  - `e2e/perf-a11y.spec.ts`
- **Content model and ordering logic**
  - `src/content.config.ts`
  - `src/utils/writing-posts.ts`
  - `src/pages/writing.astro`
- **Workflow and deployment checks**
  - `.github/workflows/deploy.yml`

## Development Process (Overview)

- **Local quality flow**
  - A consolidated local gate exists for clean -> lint/sanity -> unit -> integration.
  - Lint/sanity includes linting, formatting, and Astro structural/type checks.
- **Test orchestration strategy**
  - Integration tests are intentionally split between parallel-safe and serial-sensitive subsets.
  - The test runner defaults to stable `preview`-mode orchestration to reduce flakiness.
  - Visual snapshots are maintained through a dedicated update process.
- **Performance and accessibility process**
  - Accessibility is validated in automated browser tests (including keyboard-flow checks).
  - Homepage performance budgets are validated through a dedicated Lighthouse process.
- **Operational stability practices**
  - Cleanup routines and port/process guards are built into scripts to prevent stale-run issues.
  - Reproducibility is favored over ad-hoc speed in CI-critical paths.

## Scope Of This README

This document is intentionally focused on architecture and quality characteristics of the project.
It is not intended as a step-by-step onboarding or command cookbook.
