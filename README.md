# Jan Havlín — Personal Website

Astro-based personal website focused on clean UX, deterministic behavior, and engineering quality.

This project serves as:
- a self-defined professional space to present expertise on my own terms, without being constrained by generic social-network formats,
- a first full-scope frontend + UX implementation in this portfolio,
- an intentional bridge between backend engineering depth and visual/interaction craft.

Context:
- For most of the past years (essentially since entering IT), the primary focus has been precise internal software architecture, domain-heavy backend logic, system robustness, and performance.
- CLI development has been the main adjacent area.
- The visual direction also draws on skills first shaped before entering IT through earlier art practice.

Outcome:
- Bringing these tracks together here was an exploratory and genuinely rewarding experience that broadened perspective across adjacent software disciplines.
- Frontend is still not the intended primary specialization; the long-term center of gravity remains high-quality backend engineering for thoughtful, resilient systems.

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
